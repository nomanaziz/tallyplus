# Tally Plus — Build Plan

A mobile-first, Bangla-default SaaS for shop owners: POS billing, inventory, customer dues, expenses/income, reports, subscriptions, admin panel, and offline-first sync. Inspired by Hishabee.

> Scope note: You chose "Everything in v1." This is a very large build. We'll deliver every feature end-to-end, but some will start as solid MVPs (e.g. WhatsApp/Telegram alerts wired through one provider, reports as 4 core charts) that we deepen iteratively. Mock OTP in dev mode — swap to real SMS later by changing one edge function.

---

## 1. Public site

- **Landing page** (`/`) — Hishabee-style hero, feature grid, screenshots, pricing, FAQ, CTA. Bangla by default.
- **Pricing** (`/pricing`) — Monthly / Half-Yearly / Yearly cards with "Buy" → goes to subscription request.
- **About**, **Contact**, **Help** routes.
- Language toggle (BN/EN) in header, persisted.

## 2. Authentication

- `/auth` — Phone number entry (BD +880 default).
- `/auth/otp` — 6-digit OTP. **Dev mode: OTP shown on screen / always `123456`.** Backed by an edge function so we can swap to real SMS later.
- `/auth/pin-setup` — first-time users set 4-digit PIN.
- `/auth/pin` — returning users on same device unlock with PIN.
- Session via Supabase Auth (phone provider, OTP disabled → we manage OTP ourselves and sign user in via custom edge function issuing a session).

## 3. Subscription system

- Plans: Monthly / Half-Yearly / Yearly (admin-editable prices).
- User picks plan → creates a **subscription request** (status: pending). Uploads payment proof (bKash/Nagad txn id + screenshot).
- Admin approves → subscription becomes active with `expires_at`.
- Route guard: app features locked behind active subscription. Expired users see a paywall + "Renew" button.
- Auto-alert 7/3/1 days before expiry (WhatsApp + in-app).

## 4. Shop owner app (under `/app`, mobile-first sidebar like screenshot)

Sidebar items (Bangla labels, matching your screenshot icons):

- **ড্যাশবোর্ড** — today/week/month/year/all-time tiles: sales, purchases, expenses, stock value, receivables, payables. Quick action buttons.
- **কেনা (Purchases)** — record purchase from supplier, items, payment, due.
- **বেচা (Sales / POS)** — full POS: product search, cart, discount (%/flat), tax, payment split (cash/due), print receipt.
- **ক্যাশবক্স** — cash in/out journal.
- **দ্রুত বেচা** — one-tap quick sale (no inventory deduction, just amount).
- **কেনার খাতা / বেচার খাতা / বাকির খাতা / খরচের খাতা** — ledger views.
- **যোগাযোগ (Contacts)** — customers & suppliers with running due, send reminder via WhatsApp.
- **প্রোডাক্ট লিস্ট** — products with price, stock, barcode, photo, category, unit, expiry.
- **স্টকের হিসাব** — stock in/out history, low-stock & expired filters.
- **ব্যবসার রিপোর্ট** — sales/profit/expense/stock charts, date filters, CSV export.
- **প্রিন্টার** — receipt template settings.
- **মার্কেটিং (SMS/WhatsApp)** — bulk message customers, due reminders.
- **অনলাইন শপ** — public catalog page per shop (`/shop/:slug`), customers can place order.
- **মেয়াদোত্তীর্ণ পণ্য** — expiring soon dashboard.
- **অ্যাপ অ্যাক্সেস** — sub-users (cashier/manager) with role-based permissions.
- **অ্যাপ ট্রেনিং** — embedded help videos.
- **সেটিংস** — shop profile, logo, language, currency, PIN change, notification prefs.

## 5. Admin panel (`/admin`, role = admin)

- Users list, search, suspend, impersonate (view-only).
- Subscription requests queue → approve/reject with note.
- Active subscriptions table, manual extend.
- Plans & pricing editor.
- Broadcast notifications (push to all users via WhatsApp/in-app).
- Basic stats: MRR, active users, churn.

## 6. Notifications

One unified `notifications` service (edge function) that dispatches via:
- **WhatsApp** — through a single provider connector (e.g. Telegram Bot for free, or WhatsApp Cloud API once user provides token).
- **Telegram** — via Telegram connector (already supported).
- **In-app** — bell icon dropdown, real-time via Supabase Realtime.

Triggers: due reminder, subscription expiry, low stock, expired product, admin broadcast.

## 7. Offline-first sync (IndexedDB)

- Local DB via **Dexie (IndexedDB)** — tables mirror server: products, sales, purchases, customers, expenses, payments.
- All writes go to local DB first → queued in `outbox` table → background sync worker pushes to Supabase when online.
- Pulls server changes via `updated_at` cursor on app focus + interval.
- Conflict policy: last-write-wins per row, with a server-side trigger preserving `server_updated_at`. Conflicts logged for admin review.
- Online/offline indicator in header. Sales fully usable offline.

## 8. Tech architecture

- **Frontend**: TanStack Start (already scaffolded), Tailwind, shadcn/ui, mobile-first layouts, BN/EN i18n via lightweight context + JSON dictionaries.
- **Backend**: Supabase (already connected) — Postgres + RLS + Auth + Storage + Realtime + Edge Functions.
- **Edge functions**:
  - `send-otp` (mock now, real SMS later)
  - `verify-otp` (issues Supabase session)
  - `notify` (WhatsApp/Telegram dispatch)
  - `subscription-cron` (daily expiry checks; pg_cron → calls edge fn)
  - `admin-approve-subscription`
- **Storage buckets**: `shop-logos`, `product-images`, `payment-proofs`, `receipts`.
- **Roles**: `app_role` enum (`admin`, `owner`, `manager`, `cashier`) in `user_roles` table with `has_role()` security-definer function. RLS enforces shop-scoped access via `shop_id` on every business table.

## 9. Database (high level)

`profiles, shops, shop_members, user_roles, subscription_plans, subscriptions, subscription_requests, products, categories, stock_movements, customers, suppliers, sales, sale_items, purchases, purchase_items, payments, expenses, cash_movements, notifications, notification_settings, sync_outbox` — each business table has `shop_id`, `created_at`, `updated_at`, `deleted_at` for sync.

## 10. Build order (so it's usable as it grows)

1. DB schema + RLS + roles + auth (mock OTP + PIN) + i18n shell.
2. Landing page + pricing + subscription request + admin approval.
3. Shop setup + products + POS sales + customers + dues.
4. Purchases + expenses + cash box + ledgers.
5. Reports dashboard + CSV export.
6. Offline (Dexie + outbox + sync worker).
7. Notifications (WhatsApp/Telegram/in-app) + cron.
8. Sub-users + permissions + admin panel polish + online shop page.

## What I need from you later (not blocking)

- bKash/Nagad merchant info if you want auto payment verification (otherwise manual proof upload + admin approve works fine).
- WhatsApp Cloud API token when ready (Telegram works immediately).
- Real SMS gateway API key when you want to ship real OTP.

Approve to start building.
