## Goals

1. **Recipient never sees the request.** When the sender uploads payment proof, the request jumps to `pending_admin` and skips `pending_recipient`, so the new owner never gets a chance to accept. Plus the recipient banner is only mounted on `/app/dashboard` — a consumer recipient never sees it. Fix the state machine and surface the banner everywhere a recipient might land.
2. **No subscription / no free shop slot for the new owner.** Today the migration that moves `shops.owner_id` would silently break the recipient's plan limits. Grant a fresh 30-day trial automatically on approval if the recipient cannot fit the shop.
3. **Both sides + admin get clean notifications** (recipient via `notifications` row + a customer-portal banner; sender on status change; admin already covered).

---

## 1. Fix the transfer state machine (DB)

Edit `request_shop_transfer` and `admin_decide_shop_transfer` in a new migration:

**New flow**
```text
                          (no proof)
shop owner submits ─────────────────────►  pending_payment
                                              │ admin: verify_payment
                          (proof attached)    ▼
shop owner submits ──────────────────────►  pending_recipient
                                              │ recipient: accept   │ recipient: reject
                                              ▼                     ▼
                                          pending_admin        rejected_recipient
                                              │ admin: approve  │ admin: reject
                                              ▼                 ▼
                                          approved          rejected_admin
```

Concretely:

- `request_shop_transfer`: when `_payment_proof_url IS NOT NULL` set initial status to `'pending_recipient'` (was `'pending_admin'`). When NULL keep `'pending_payment'`.
- `admin_decide_shop_transfer` action `verify_payment`: from `pending_payment` → `pending_recipient` (unchanged).
- Recipient `respond_shop_transfer` accept: `pending_recipient` → `pending_admin` (unchanged).
- `admin_decide_shop_transfer` action `approve`: still requires `pending_admin`, calls new helper `grant_post_transfer_trial(_recipient, _shop_id)` after `UPDATE shops SET owner_id = …`.

## 2. Auto-trial on approval (DB)

New SECURITY DEFINER function `grant_post_transfer_trial(_user_id uuid, _shop_id uuid)`:

- If `trial_settings.is_enabled` is false → no-op.
- Look up the recipient's currently active subscription (`status IN ('active','trial')`, `expires_at > now()`) and join `subscription_plans` for `max_shops`.
- Compute `current_shop_count = user_active_shop_count(_user_id)` (this already includes the just-transferred shop because we run after `UPDATE shops`).
- If recipient has no active subscription, OR `current_shop_count > max_shops`:
  - Insert a fresh subscription row using the `'trial'` plan with `starts_at = now()` and `expires_at = now() + 30 days` and `status = 'trial'`. This is a *post-transfer* trial — it bypasses the once-per-user gate inside `grant_trial_subscription` (we do not call that function).
  - Send notifications.notification to recipient: "এই দোকান হস্তান্তরের সাথে ৩০ দিনের ফ্রি Trial পেয়েছেন।"

Edge case: recipient already has lifetime/yearly with `max_shops >= count` → don't grant trial (no need).

Edge case: recipient already on trial that still has slots → don't extend.

Edge case: recipient has an *expired* subscription → grant trial.

We deliberately allow a new trial here even if the user used trial before — this is "ownership transfer trial," distinct from the signup trial.

## 3. Recipient-side surfacing

**a. Mount `IncomingTransfersBanner` in the customer portal** (`src/pages/customer/CustomerLayout.tsx` — render above `<Outlet />` in the main content area). It already filters by `to_user_id = auth.uid()` so it works for any user role.

**b. Notify the recipient on insert.** Add a small DB trigger `tg_notify_transfer_recipient` on `INSERT OR UPDATE OF status` on `shop_transfer_requests`:
- On insert with status `pending_recipient` → insert into `notifications` for `to_user_id` with link `/app` (or `/customer/dashboard` if recipient is a consumer — link to `/`, both layouts now show the banner).
- On update from `pending_payment → pending_recipient` (after admin verifies) → notify the recipient that they need to act.
- On `approved` or `rejected_*` → notify both `from_user_id` and `to_user_id`.

**c. Sender visibility.** On the existing Shops page (`src/pages/app/Shops.tsx`) status badges already exist; no change needed beyond ensuring the new flow's status names render (they do — `pending_recipient` is in `STATUS_TONE`).

## 4. Admin UI tweak (`src/pages/admin/Transfers.tsx`)

Show a small inline note for `pending_admin` rows whether the recipient has an active subscription / will get a trial, so the admin understands what will happen on Approve. Read it cheaply with a per-row `useQuery` fetching `subscriptions` count for `to_user_id`. (Optional polish — can skip if tight.)

---

## Files

Created:
- `supabase/migrations/<timestamp>_transfer_flow_and_trial.sql` — function rewrites + new helper + recipient-notify trigger.

Edited:
- `src/pages/customer/CustomerLayout.tsx` — render `<IncomingTransfersBanner />` at the top of the page content.
- `src/pages/admin/Transfers.tsx` — show a "recipient subscription status" hint on pending_admin rows (optional).
- `src/components/app/IncomingTransfersBanner.tsx` — show the shop name + a brief "After accept admin will finalize and you'll get 30-day Trial if needed" line.

No schema changes — only function/trigger replacements.
