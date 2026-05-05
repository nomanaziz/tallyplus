# Personal Finance Upgrade — Customer Money Module

বর্তমানে `/customer/money` এ আছে: simple income/expense entry, fixed category list, voice note input, loan tab, cash summary, monthly history. নিচের সব feature এর উপর build হবে — phased delivery, প্রতি phase আলাদা approval দিতে পারবেন।

---

## Phase 1 — Foundations: Sub-categories + Accounts + Recurring

**Goal:** ক্যাটাগরি/সাব-ক্যাটাগরি custom করা যায়, প্রতিটি transaction-এ wallet/account tag হবে, এবং recurring entry auto-generate হবে।

**DB changes (migration):**
- `consumer_categories` — `id, user_id, name, kind('income'|'expense'), parent_id (self FK), icon, color, is_archived` (RLS: user_id = auth.uid()).
- `consumer_accounts` — `id, user_id, name, kind('cash'|'bank'|'bkash'|'nagad'|'card'|'other'), opening_balance, color, is_archived`. Seed default "নগদ" account on first use.
- `consumer_transactions` — add `account_id`, `subcategory_id`, `transfer_group_id` (uuid; pairs two rows for transfers).
- `consumer_recurring_rules` — `id, user_id, type, amount, account_id, category, subcategory_id, note, frequency('daily'|'weekly'|'monthly'|'yearly'), day_of_month, next_run_date, last_run_date, is_active`.
- DB function `consumer_account_balance(user_id)` returning per-account balance (opening + sum of in − out, including transfers).
- pg_cron daily job → calls TanStack server route `/api/public/hooks/run-recurring` which uses `supabaseAdmin` to insert `consumer_transactions` for any rule with `next_run_date <= today` and bumps `next_run_date`.

**UI:**
- New section `Settings → ক্যাটাগরি ও অ্যাকাউন্ট` (modal from Money page header):
  - Category manager with parent/child tree, add/edit/archive, default categories seeded once.
  - Account manager with kind icons, opening balance, archive.
- Transaction entry sheet: add Account dropdown (default = last used), Subcategory dropdown (filtered by parent category), "Transfer" tab → from-account → to-account → amount (creates two linked rows).
- New "অটো এন্ট্রি" tab on Money page listing recurring rules with toggle/edit/delete.

---

## Phase 2 — Budgets + Alerts + Rollover

**DB:**
- `consumer_budgets` — `id, user_id, month (date, 1st of month), category_id, subcategory_id (nullable), amount, rollover_enabled`.
- View / RPC `consumer_budget_status(_user_id, _month)` → returns rows with `{category, budget, spent, percent, rolled_in}` where `rolled_in = previous_month(budget − spent)` if rollover enabled and positive.

**UI:**
- New tab "বাজেট" on Money page:
  - Month selector, list of budget cards (category-wise progress bar, color: green <60%, amber 60–80%, red >80%).
  - "+ বাজেট যোগ" sheet with category, amount, rollover toggle.
- Toast warning when an entry crosses 80% / 100% of its category budget at save time.
- Optional Web Push (later): browser notification when threshold crossed (Phase 8).

---

## Phase 3 — Savings Goals

**DB:**
- `consumer_savings_goals` — `id, user_id, title, target_amount, target_date (nullable), icon, color, is_archived, created_at`.
- `consumer_savings_contributions` — `id, goal_id, user_id, amount, contributed_at, source_account_id, note`. Trigger: on insert also writes a paired `consumer_transactions` row (expense category = "সঞ্চয়/বিনিয়োগ", linked via `source_savings_id` column added to transactions).

**UI:**
- New page `/customer/savings`:
  - Cards per goal with progress bar `current/target`, ETA (`current contribution rate × remaining`).
  - "জমা দিন" sheet: amount + account → records contribution + expense in one tx.
  - Mark-as-emergency-fund flag (badge on dashboard).

---

## Phase 4 — Loan/EMI Reminders + Auto-expense

`consumer_loans` already exists. Additions:
- New columns: `emi_amount, emi_day_of_month, reminder_enabled, next_due_date`.
- pg_cron daily job → loops loans with `next_due_date <= today + 3` and inserts `consumer_notifications` (new table `id, user_id, kind, title, body, link, read_at`).
- On EMI payment: existing `consumer_loan_payments` insert → trigger writes `consumer_transactions` expense row with category "ঋণ পরিশোধ" and decrements loan balance.

**UI:**
- Loans tab gains EMI fields, "next due in X days" badge.
- Bell icon in `CustomerLayout` header showing unread notification count + dropdown.

---

## Phase 5 — Analytics & Reports

**UI:** New page `/customer/analytics` (also embedded mini-charts on Money page).

- Recharts components:
  - **Pie chart** — current month expense by category.
  - **Bar chart** — last 6 months income vs expense.
  - **Line chart** — daily cumulative spend vs budget for selected month.
  - **Heat strip** — day-of-week spend pattern.
- "Spending Habits" panel: simple client-side calc — flag categories where `current_month_spend > prev_month_spend × 1.15` with text like "রেস্টুরেন্টে গত মাসের চেয়ে ২২% বেশি খরচ"। (No AI cost; pure compute. AI summary optional later via Lovable Gateway.)
- **Export buttons** (top of analytics page):
  - PDF — uses `print-report.ts` style infrastructure already in repo.
  - Excel — uses `xlsx` (need to add: `bun add xlsx`). Sheets: Transactions, Budgets, Goals, Loans.

---

## Phase 6 — Receipt OCR

Reuse existing `parse-fordo-image` pattern.
- New edge function `parse-receipt-image` (Lovable AI Gateway, `google/gemini-2.5-flash` vision). Tool-call schema returns `{vendor, total_amount, date, suggested_category, line_items[]}`.
- Camera/upload button on transaction entry sheet → preview parsed result → user confirms → pre-fills amount/date/category/note. No image storage.

---

## Phase 7 — Shared / Family Wallet

**DB:**
- `consumer_shared_wallets` — `id, owner_id, name, description, currency, created_at`.
- `consumer_shared_wallet_members` — `wallet_id, user_id, role('owner'|'member'), joined_at, invite_phone (for pending invites)`.
- `consumer_shared_transactions` — same shape as `consumer_transactions` + `wallet_id, paid_by_user_id, split_mode('equal'|'shares'|'exact'), splits jsonb`.
- RPC `shared_wallet_settlement(wallet_id)` → returns who-owes-whom matrix.

**UI:**
- New page `/customer/shared-wallets` — list, create, invite by phone, member roster.
- Wallet detail page: ledger of shared expenses, "Settlement" tab with simplified debts list and "Mark settled" action.

---

## Phase 8 — Security/Backup (web-realistic subset)

> Native bank-SMS reading, Touch/Face ID, এবং Google Drive backup web app এ সম্ভব না — phone OS API লাগে। নিচেরগুলা web-এ realistic:

- **App PIN lock** — optional 4-digit PIN stored hashed in `consumer_profiles.pin_hash`; entered on app open (idle > 5 min). LocalStorage flag for "remember this device 30 days".
- **WebAuthn / Passkey** — browsers যেগুলা support করে, fingerprint/Face ID দিয়ে PIN bypass (graceful fallback).
- **Email/SMS 2FA** — supabase OTP flow on login already exists; expose toggle in profile to require it every login.
- **Cloud backup** — already cloud-native (Supabase)। User-facing "Export full backup (JSON)" button + "Restore from JSON" (validates schema)।
- **Offline queue** — already implemented via `useOfflineWrite`; surface a small "X entries pending sync" indicator.

Bank SMS sync, native biometric, Drive backup → documented as "mobile app only" and parked.

---

## Suggested rollout order

1. Phase 1 (foundations) — biggest unlock, all later phases depend on accounts + sub-categories.
2. Phase 2 (budgets) + Phase 5 (analytics) — together, since they share month-aggregation queries.
3. Phase 3 (savings) + Phase 4 (loan/EMI) — small, independent.
4. Phase 6 (OCR) — quick win, reuses existing infra.
5. Phase 7 (shared wallet) — large, do alone.
6. Phase 8 (security polish) — last.

---

## Technical notes

- All new tables get RLS `user_id = auth.uid()` (members table uses `EXISTS` against wallet membership).
- Recurring + EMI cron uses `/api/public/hooks/*` TanStack server route (anon key header) — not edge function.
- Charts: `recharts` already in repo (used elsewhere — verify before phase 5).
- Excel export: add `xlsx` (`bun add xlsx`).
- All Bangla labels match existing tone (e.g. "সঞ্চয়", "বাজেট", "অ্যাকাউন্ট").
- Mobile bottom nav stays at 5 items; new pages reachable from Money page header tabs and side nav (desktop)।

---

**পরবর্তী পদক্ষেপ:** Approve করলে Phase 1 দিয়ে শুরু করব। প্রতি phase শেষে preview check করে পরের phase এ যাব।