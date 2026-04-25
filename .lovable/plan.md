# Affiliate Portal v2 — Full Interactive System

Rebuild the affiliate area into a real, functional partner portal that matches the screenshots from `hishabee-affiliate.netlify.app`. Every number on every screen will be driven by real database data. Partners can earn, withdraw, OR spend earnings on their own subscription. Admin controls every rule and approves every payout.

---

## 1. New Database Tables (migration)

Extend the existing `affiliates`, `affiliate_tiers`, `affiliate_referrals`, `affiliate_commissions`, `affiliate_settings` with:

**`affiliate_wallet`** — one row per affiliate
- `affiliate_id` (PK), `available_balance`, `pending_balance`, `lifetime_earned`, `lifetime_withdrawn`, `lifetime_spent_on_subscription`

**`affiliate_wallet_transactions`** — full ledger
- `id`, `affiliate_id`, `type` (`commission_credit` | `agent_bonus` | `tier_bonus` | `withdrawal_debit` | `subscription_debit` | `adjustment`), `amount` (signed), `balance_after`, `reference_id` (commission/withdrawal/etc.), `note`, `created_at`

**`affiliate_withdrawals`** — withdrawal requests
- `id`, `affiliate_id`, `amount`, `method` (`bkash`|`nagad`|`rocket`|`bank`), `account_number`, `account_name`, `status` (`pending`|`approved`|`paid`|`rejected`), `admin_note`, `transaction_ref`, `requested_at`, `processed_at`, `processed_by`

**`affiliate_agents`** — sub-affiliates (agents added by an affiliate)
- `id`, `parent_affiliate_id`, `agent_user_id` (nullable), `full_name`, `phone`, `email`, `status` (`active`|`inactive`), `created_at`. Adds 2-level structure: agent's referrals also pay a small `%` to parent affiliate (admin-controlled `agent_override_pct` in settings).

**`affiliate_payout_methods`** — admin-managed list of accepted methods + min/max amounts, fees.
- `id`, `key`, `label_bn`, `label_en`, `min_amount`, `max_amount`, `fee_pct`, `is_active`

**`affiliate_marketing_assets`** — admin-uploaded banners, copy templates, video links the partner can download/share.
- `id`, `title`, `type` (`banner`|`video`|`copy`|`pdf`), `url`, `description`, `is_active`, `sort_order`

**Extend `affiliate_settings`** with: `min_withdrawal_amount`, `max_withdrawal_per_month`, `agent_override_pct`, `auto_tier_upgrade` (bool), `subscription_pay_enabled` (bool), `support_phone`, `support_email`, `live_chat_url`.

**Extend `affiliate_tiers`** with: optional `color` (badge color hex) and ensure default seeded tiers match the screenshot: `Independent` (10%, 0% bonus, 0 sales), `Active` (15%, +10%, 10k), `Rising Star` (16%, +5%, 50k), `Bronze` (18%, +2.5%, 100k), `Silver` (20%, +2%, 500k), `Gold` (22%, +2%, 10L), `Platinum` (23%, +2%, 25L), `Diamond` (24%, +2%, 50L), `Titan` (25%, +2%, 1Cr).

**DB triggers / functions:**
- `affiliate_recalculate_tier(affiliate_id)` — picks highest tier where `total_sales >= min_sales` and updates `current_tier_id`. Called whenever a commission row is approved.
- `affiliate_apply_commission(commission_id)` — when a commission is `approved`, debits `pending_balance`, credits `available_balance`, inserts a `wallet_transactions` row, increments `lifetime_earned`, recomputes tier, and (if agent override applies) creates an additional `agent_bonus` commission row for the parent.
- All new tables get RLS: affiliate sees own data; admin sees all.

---

## 2. New Layout — Affiliate Portal Shell

Create `src/routes/app.affiliate.tsx` as a layout (Outlet) with the sidebar from the screenshots and these child routes:

```text
src/routes/
  app.affiliate.tsx                 -> layout with yellow sidebar + topbar
  app.affiliate.index.tsx           -> Dashboard (welcome + stats + top affiliates)
  app.affiliate.earnings.tsx        -> Earnings (cards + tabs: All/Referral/Agent/Bonus + commission policy)
  app.affiliate.referrals.tsx       -> Referrals + agent management ("নতুন এজেন্ট যোগ করুন" / "নতুন রেফারেল যোগ করুন")
  app.affiliate.tiers.tsx           -> Commission tiers comparison + current tier progress
  app.affiliate.marketing.tsx       -> Share link, QR, banners, copy templates
  app.affiliate.training.tsx        -> Training videos (reuse existing training data, filtered to "affiliate" topic)
  app.affiliate.help.tsx            -> Help center (FAQ accordion + chat + contact + message form)
  app.affiliate.withdraw.tsx        -> Withdrawal flow (request, history, methods)
  app.affiliate.pay-subscription.tsx-> Use balance to pay own subscription
```

The sidebar shows: ড্যাশবোর্ড, আয়, রেফারেল, কমিশন টিয়ার, মার্কেটিং, প্রশিক্ষণ, সাহায্য. Header chip shows shop name + current tier badge ("Independent Affiliate" style). Yellow `#FACC15` highlight on active item like the reference.

---

## 3. Page-by-page Logic

### Dashboard (`/app/affiliate`)
- Welcome banner: "স্বাগতম, {shop_name}".
- 2 hero stats: মোট আয় (lifetime_earned), রেফারেল (total_referrals).
- 4 stat cards: মোট আয়, এই মাস (sum of commissions this month), মোট রেফারেল, কনভার্শন রেট (`converted/total*100`).
- শীর্ষ এফিলিয়েট leaderboard table: top 10 affiliates this month with rank icons (trophy/medal), name, referrals, earnings, status badge. Sourced via `select ... order by month_earnings desc limit 10`.

### Earnings (`/app/affiliate/earnings`)
- 3 cards: মোট আয় (`available_balance + lifetime_withdrawn + lifetime_spent`), অপেক্ষমান পেমেন্ট (`pending_balance`), এজেন্ট কমিশন (sum from agent_bonus type).
- Tabs: সকল আয় / রেফারেল / এজেন্ট / বোনাস — each tab filters `affiliate_wallet_transactions` by type.
- Table: তারিখ, বিবরণ, পরিমাণ, স্ট্যাটাস, with pagination.
- "কমিশন পলিসি" section pulled from `affiliate_settings` (referral % + agent % + bonus rules).
- Top buttons: "টাকা তুলুন" → withdraw page, "সাবস্ক্রিপশন কিনুন" → pay-subscription page.

### Referrals (`/app/affiliate/referrals`)
- Stats row: মোট রেফারেল, কনভার্শন রেট, মোট কমিশন, অপেক্ষমান কমিশন.
- "এজেন্ট পারফরম্যান্স" row: মোট এজেন্ট, সক্রিয় এজেন্ট, এজেন্ট সাবস্ক্রিপশন, এজেন্ট কমিশন.
- Two CTAs: **নতুন এজেন্ট যোগ করুন** (dialog → inserts into `affiliate_agents`, generates a sub-referral code), **নতুন রেফারেল যোগ করুন** (dialog → manual referral entry, creates `affiliate_referrals` with status=`pending`).
- Referrals table: name search, name, যোগদান, প্যাকেজ, কমিশন, স্ট্যাটাস, অ্যাকশন (resend invite link).
- Empty state: "কোনো এজেন্ট যোগ করা নেই".

### Commission Tiers (`/app/affiliate/tiers`)
- "কমিশন তুলনা টেবিল": all tiers with name (current marked "বর্তমান"), commission %, bonus %, min sales — highlight current row in yellow.
- Right column: "আপনার বর্তমান টিয়ার" card with name, commission badge, sales-vs-target progress bar, and "X টাকা সেল বাকি আছে {next_tier} টিয়ার পেতে".
- Below: "পরবর্তী টিয়ার" card.
- Bottom: card grid for each tier with commission, bonus badge, and min sales.

### Marketing (`/app/affiliate/marketing`)
- Big copy box: referral link `https://app.hishabee.io/?ref={CODE}` with copy/QR/share buttons (WhatsApp, Facebook, Telegram, X, email).
- QR code (use `qrcode` lib, install via `bun add qrcode`).
- Banner gallery from `affiliate_marketing_assets` (download buttons).
- Pre-written copy templates (BN/EN) — click to copy.

### Training (`/app/affiliate/training`)
- List training videos filtered by `topic = 'affiliate'` from existing training table; embedded player.

### Help (`/app/affiliate/help`)
- 3 hero cards: সাধারণ প্রশ্ন (scrolls to FAQ), লাইভ চ্যাট (opens `live_chat_url`), যোগাযোগ (phone + email from settings).
- FAQ accordion: 5 default questions, admin-editable from admin panel.
- Message form → inserts into existing `wishlist`/new `affiliate_support_messages` table.

### Withdraw (`/app/affiliate/withdraw`)
- Available balance (large), min withdrawal info.
- Form: amount, method (from `affiliate_payout_methods` active rows), account number, account name → creates `affiliate_withdrawals` (status=pending) and immediately decrements `available_balance` (held).
- History table with status badges; reject re-credits balance.

### Pay Subscription (`/app/affiliate/pay-subscription`)
- Shows available balance vs current/upgrade subscription price.
- "ব্যালান্স দিয়ে পরিশোধ করুন" button → debits wallet (`subscription_debit`), creates a `subscriptions` row (or extends existing) for the user. If balance < price, show shortfall amount and link to top-up via normal subscription flow.

---

## 4. Admin Side (`/admin/affiliates`)

Expand the existing admin tabs:

- **Overview** (new): KPIs across the program — total partners, active partners, this month's commissions, pending withdrawals count + amount, top performers.
- **Settings**: existing fields + new ones (min withdrawal, agent override %, support phone/email, live chat URL, auto-tier upgrade toggle, subscription-pay toggle).
- **Tiers**: existing + color picker + reset-to-defaults button (seeds the 9 tiers from screenshot).
- **Affiliates**: existing list + view detail (wallet balance, withdrawal history, manual adjustment dialog inserts a `wallet_transactions` row).
- **Commissions**: existing approve/pay flow now triggers `affiliate_apply_commission` (server function) which moves money pending → available.
- **Withdrawals** (new tab): pending list with approve / mark-paid / reject buttons; reject re-credits wallet; mark-paid records `transaction_ref`.
- **Marketing Assets** (new tab): CRUD for `affiliate_marketing_assets` (upload to `product-images` bucket or new `affiliate-assets` bucket).
- **Payout Methods** (new tab): CRUD for `affiliate_payout_methods`.
- **Support Messages** (new tab): inbox for messages submitted from Help page.

---

## 5. Server Functions / Edge Functions

Use TanStack `createServerFn` + Supabase service role client (`client.server.ts`) for sensitive operations to bypass RLS safely:

- `requestWithdrawal({ amount, method, account })` — validates min/max, debits wallet atomically.
- `approveCommission({ id })` / `rejectCommission({ id })` — admin only; runs ledger updates.
- `processWithdrawal({ id, action, txnRef? })` — admin only.
- `paySubscriptionWithBalance({ planId })` — debits wallet, creates subscription.
- `addAgent({ fullName, phone, email })` — generates agent code, links to parent.

All server functions verify `is_admin(auth.uid())` for admin-only actions.

---

## 6. Wiring & Polish

- Add new sidebar item **"গ্রোথ পার্টনার"** (already exists) → routes to `/app/affiliate`.
- Update `AppSidebar` to highlight properly.
- The existing `/app/affiliate` page (current dashboard) becomes `/app/affiliate/index.tsx` content.
- The `RefCaptureProvider` already captures `?ref=`. Update `signup-with-pin` edge function to insert into `affiliate_referrals` on signup if a referral code is in localStorage and POSTed with the request.
- Update `app.subscribe.tsx` so successful subscription not only inserts a pending commission, but the commission insert (after admin approval) auto-credits via the trigger above.
- Reuse existing `Card`, `Tabs`, `Accordion`, `Dialog`, `Sheet`, `Badge`, `Progress`, `Input`, `Button` components — no new UI primitives needed except `qrcode` lib.

---

## 7. Files To Create / Modify

**Created (~14 files)**
- `supabase/migrations/<ts>_affiliate_v2.sql`
- `src/routes/app.affiliate.tsx` (converted to layout)
- `src/routes/app.affiliate.index.tsx`
- `src/routes/app.affiliate.earnings.tsx`
- `src/routes/app.affiliate.referrals.tsx`
- `src/routes/app.affiliate.tiers.tsx`
- `src/routes/app.affiliate.marketing.tsx`
- `src/routes/app.affiliate.training.tsx`
- `src/routes/app.affiliate.help.tsx`
- `src/routes/app.affiliate.withdraw.tsx`
- `src/routes/app.affiliate.pay-subscription.tsx`
- `src/components/affiliate/AffiliateSidebar.tsx`
- `src/components/affiliate/AddAgentDialog.tsx`, `AddReferralDialog.tsx`
- `src/server/affiliate.functions.ts` (server functions)

**Modified**
- `src/routes/admin.affiliates.tsx` (add Withdrawals, Assets, Methods, Support, Overview tabs)
- `src/routes/app.subscribe.tsx` (use approved commission flow)
- `src/integrations/supabase/types.ts` (regenerated)
- `src/components/app/AppSidebar.tsx` (point to new layout)
- `supabase/functions/signup-with-pin/index.ts` (referral attribution)
- `package.json` (add `qrcode`)

---

## 8. Out of scope (this iteration)
- Real money transfer integrations (bKash/Nagad APIs) — we record the `transaction_ref` manually, admin pays out externally.
- Multi-currency.
- Affiliate mobile app.

After approval, the migration runs first, then routes/components, then admin-side enhancements, then polish + QA.