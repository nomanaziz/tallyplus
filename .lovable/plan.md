## Goal

Make subscription purchase flow support **two clear modes** (Pay Online via Recharge Server, Pay Manually via admin-configured methods like bKash/Nagad), fix the failed-callback "Page Not Found" issue, and give Admin a log of failed/cancelled payment attempts so they can follow up with customers.

---

## 1. Fix the "Page Not Found" on `/app/subscribe/callback`

**Root cause:** The route `/app/subscribe/callback` exists in `src/routes.tsx` (line 170), so it works in preview. The published site (`tallyplus.lovable.app`) returns a hard 404 because the published deployment is stale (every `/app/*` path returns 404 on the published domain right now). The user needs to **republish** the project after these changes go in. No code change is needed for the route itself, but we will harden the callback page to gracefully handle missing/extra query parameters from Recharge Server.

Additionally, in `SubscribeCallback.tsx`:
- Always log the attempt outcome (success / cancel / failed) into `payment_transactions` even if `local_id` is missing — fall back to looking up by `transactionId`.
- After 3 seconds on success, auto-redirect to `/app/dashboard`.
- Show an "Admin notified — they may contact you" line on failure so the user knows it's not silent.

---

## 2. Subscribe page UI: clear Online vs Manual choice

Refactor `src/pages/app/Subscribe.tsx`:

- After clicking a paid plan, **always** show a step-2 section with two big buttons:
  1. **Pay Online (Card / bKash / Nagad / Rocket)** — only shown if `payment_gateway_settings.is_enabled = true`. Triggers `recharge-create-payment` → redirects to Recharge Server.
  2. **Manual Payment** — always available. Reveals the existing list of admin-configured `payment_methods` (bKash / Nagad / Bank etc.) with copy buttons, transaction-ID input, and submit-for-verification flow (already exists, just gate it behind this button).

This removes the current "auto-redirect to gateway when enabled" behaviour so the user can always choose manual even when the gateway is on.

---

## 3. Log every payment attempt (success, cancel, failed)

The `payment_transactions` table already exists and is written to by `recharge-create-payment` (status `pending`) and updated by `recharge-verify-payment`. Two changes:

- **`recharge-verify-payment`** already updates the row to `completed` / `pending` / `failed`. Extend it to also store `payment_method`, `paid_amount`, `payment_fee`, and `failure_reason` (cancel vs failed vs unverified) into `raw_response` so the admin log is rich.
- **`SubscribeCallback.tsx`**: when status is `cancel` or `failed` and we reach the page, always invoke `recharge-verify-payment` so the row gets a final terminal status (today it only does so when `transactionId` is present — make this robust and fall back to marking the local row `failed` via a small helper edge function `recharge-mark-failed` when no `transactionId` is returned).

**New migration:** add `failure_reason text` and `payment_method text` columns to `payment_transactions` if they don't already exist. Index `(status, created_at desc)` for the admin log view.

---

## 4. New Admin page: Payment Attempts Log

Add `src/pages/admin/PaymentAttempts.tsx` and route `/admin/payment-attempts`:

- Table listing every `payment_transactions` row, newest first.
- Columns: Date, User (name + phone from `profiles`), Plan name, Amount, Status badge (pending/completed/failed/cancelled), Transaction ID, Payment Method, Failure Reason.
- Filters: status (all / failed / cancelled / pending / completed), date range, search by phone/name.
- "Call customer" action button (`tel:` link using the user's phone) so admin can quickly follow up on failed attempts.
- Add link to this page in `src/components/admin/AdminSidebar.tsx` and a card on `src/pages/admin/Index.tsx` showing "X failed attempts in last 7 days".

RLS: only admins (existing `is_admin()` check) can SELECT all rows in `payment_transactions`.

---

## 5. Files & changes summary

**Database migration** (new):
- Add `failure_reason text`, `payment_method text` columns to `payment_transactions` (if missing)
- Index `payment_transactions(status, created_at desc)`
- RLS policy allowing admins to SELECT all rows

**Edge functions:**
- `supabase/functions/recharge-verify-payment/index.ts` — store richer failure info
- `supabase/functions/recharge-mark-failed/index.ts` (new) — mark a local tx failed when callback returns cancel/failed without verifiable transactionId

**Frontend:**
- `src/pages/app/Subscribe.tsx` — two-step flow with explicit Online vs Manual choice
- `src/pages/app/SubscribeCallback.tsx` — robust logging on all outcomes, auto-redirect on success
- `src/pages/admin/PaymentAttempts.tsx` (new)
- `src/routes.tsx` — register `/admin/payment-attempts`
- `src/components/admin/AdminSidebar.tsx` — add nav link
- `src/pages/admin/Index.tsx` — add "Failed attempts (7d)" KPI card

**Republish required:** After these changes are merged, the user must click Publish so `tallyplus.lovable.app` serves the updated build (this is what's actually causing the current 404).
