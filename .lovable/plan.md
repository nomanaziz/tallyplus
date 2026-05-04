## Goal

Give every newly registered shop owner an automatic **1-month free trial with full (lifetime-equivalent) access**. Admin can enable/disable the trial system globally and configure its duration. Show countdown warnings near expiry. After expiry, the user automatically falls back to the **free plan limits** (10 products, 10 sales etc.) until they purchase a subscription.

---

## 1. Database changes (migration)

**a) New `trial_settings` table** (single-row global config, admin-managed):
```
id boolean PK default true (single row guard)
is_enabled boolean default true
duration_days int default 30
warn_days_before int default 5         -- start showing warning N days before expiry
created_at, updated_at
```
RLS: anyone authenticated can SELECT; only admins can UPDATE (via `is_admin(auth.uid())`).

**b) New `trial` plan row** in `subscription_plans`:
- `code='trial'`, `name_bn='ফ্রি ট্রায়াল'`, `price_bdt=0`, `duration_days=30`, `max_shops=2`, `is_active=true` (hidden from Subscribe page via filter).

**c) `usage_limits` for `trial` plan**: copy from `lifetime` (all `-1` = unlimited) so trial = full access.

**d) Extend `subscription_status` enum** to include `'trial'` so we can distinguish trials from paid subscriptions in the existing `subscriptions` table — no new tables needed for tracking.

**e) Trigger `tg_grant_trial_on_signup`** on `auth.users` AFTER INSERT (also fires from `handle_new_user` for owner accounts only):
- If `trial_settings.is_enabled` and the user has no existing subscription → insert into `subscriptions(user_id, plan_id=trial, status='trial', expires_at = now()+duration_days)`.
- Skip for `consumer` accounts.

**f) Update `user_active_plan_code(_user_id)`**: also accept `status='trial'` (currently filters `status='active'`). Same change for `has_active_subscription` and `user_shop_limit`.

**g) Backfill**: for every existing owner with no active subscription, if trial is enabled, insert a trial row using `created_at` of the user (capped so already-old users don't get a fresh trial — only users created within the last `duration_days` get the remaining time).

---

## 2. Admin UI — `src/pages/admin/Settings.tsx` (or new section)

Add a **"Free Trial Settings"** card:
- Toggle: Enable free trial for new users
- Number input: Trial duration (days), default 30
- Number input: Warning days before expiry, default 5
- Save button → upserts into `trial_settings`.

Reads/writes via `supabase.from('trial_settings')`.

---

## 3. Frontend — Trial banner & warnings

**New hook `src/hooks/useSubscriptionStatus.ts`**:
Returns `{ planCode, status, expiresAt, daysLeft, isTrial, isExpiringSoon }` by querying the latest active/trial subscription for `user.id`.

**New component `src/components/app/TrialBanner.tsx`** mounted in the app layout (above page content):
- If `isTrial` and `daysLeft > warn_days_before` → green pill "ফ্রি ট্রায়াল চলছে — আর X দিন বাকি"
- If `isTrial` and `daysLeft ≤ warn_days_before` → amber/red banner "আপনার ফ্রি ট্রায়াল আর মাত্র X দিন বাকি — এখনই Full Version কিনুন" with a CTA button → `/app/subscribe`
- If trial just expired (no active sub) → red banner "ফ্রি ট্রায়াল শেষ — আপনি এখন Free প্ল্যানে আছেন (১০টি পণ্যের সীমা)" with Subscribe CTA.
- Dismissible per-day via `localStorage` (but the urgent ≤5 days banner reappears on refresh).

**Subscribe page**: show trial status row at top ("ট্রায়াল শেষ হবে: ২০২৬-০৫-৩০") instead of "Free".

---

## 4. Auto-fallback to free plan

No data deletion. Existing `tg_enforce_usage_limit` triggers and `user_active_plan_code()` already enforce the free-plan limits the moment the trial subscription's `expires_at` passes (because `user_active_plan_code` falls back to `'free'` when no active/trial sub exists). 

**Daily cleanup**: scheduled job (pg_cron) that flips `subscriptions.status` from `'trial'` to `'expired'` once `expires_at < now()`. This keeps the data clean and ensures `has_active_subscription` returns false.

---

## 5. Files to create / edit

**Migrations** (one new file):
- `trial_settings` table + RLS + seed row
- `trial` plan + `usage_limits` rows
- enum extension `subscription_status += 'trial'`
- updated `user_active_plan_code` / `has_active_subscription` / `user_shop_limit`
- updated `handle_new_user` to grant trial
- backfill for existing users
- pg_cron daily job to expire trials

**Code**:
- `src/hooks/useSubscriptionStatus.ts` (new)
- `src/components/app/TrialBanner.tsx` (new)
- `src/pages/admin/Settings.tsx` (edit — add Trial Settings card) *or* new `src/pages/admin/TrialSettings.tsx` linked from admin nav
- App layout file (where shop pages are wrapped) → mount `<TrialBanner />`
- `src/pages/app/Subscribe.tsx` → show trial expiry instead of "Free" when on trial

---

## 6. Behavior summary

| State | Plan code | Limits | UI |
|---|---|---|---|
| Just signed up (admin trial ON) | `trial` | unlimited | Green "trial active" pill |
| Trial, ≤ 5 days left | `trial` | unlimited | Amber/red warning + Subscribe CTA |
| Trial expired, no purchase | `free` (fallback) | 10 products etc. | Red "trial ended" banner + CTA |
| Purchased subscription | `monthly`/`yearly`/`lifetime` | unlimited | No banner |
| Admin trial OFF (new signups) | `free` | 10 products etc. | No trial granted |

After approval I will create the migration and code in one go.