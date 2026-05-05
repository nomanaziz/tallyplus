# Three fixes

## 1. Shop card — show transfer status

In `src/pages/app/Shops.tsx`, alongside loading shops, fetch any `shop_transfer_requests` rows for the current user's shops where `status` starts with `pending` (or recently `approved`/`rejected`). For each shop card show a coloured badge in the top-right when a request exists:

- `pending_payment` — amber "পেমেন্ট যাচাই বাকি / Awaiting payment review"
- `pending_admin` — purple "Admin verification চলছে / Pending admin"
- `pending_recipient` — blue "নতুন owner accept করেননি / Awaiting recipient"
- `approved` (last 24h) — emerald "হস্তান্তর সম্পন্ন / Transferred"
- `rejected_admin` / `rejected_recipient` — rose "প্রত্যাখ্যাত / Rejected"

Also disable the Transfer button (ArrowRightLeft) when a pending row already exists for that shop, with a tooltip "একটি request ইতিমধ্যে চলছে".

Query shape:
```ts
supabase.from("shop_transfer_requests")
  .select("shop_id,status,created_at")
  .in("shop_id", shops.map(s => s.id))
  .order("created_at", { ascending: false });
```
Pick latest row per shop id client-side and map to badge.

## 2. Subscribe page — keep both payment modes (no change)

Confirm `src/pages/app/Subscribe.tsx` already shows the "Choose how to pay" step with both Online (auto) and Manual cards. No code change required; verify the gateway-disabled fallback still allows manual.

## 3. Customer page split: Subscription / Money history / Report history

Currently `src/pages/customer/Money.tsx` mixes income–expense entries, the locked-history subscription gate, and the plan-purchase dialog into one screen. Split into three dedicated routes so subscription stands alone:

a) **`/customer/money`** — keep only the current month income/expense entry + add buttons + summary tiles + loans tab. Remove the "Subscription দেখুন" CTA inline; instead show a small banner "পুরোনো মাসের বিস্তারিত দেখতে → Subscription নিন" linking to `/customer/subscription`.

b) **`/customer/history`** (new file `src/pages/customer/History.tsx`) — the month navigator + locked/unlocked detail list (income–expense history) + report-style monthly totals. Move `canAccessMonthDetail` gating here. If locked, show CTA → `/customer/subscription`.

c) **`/customer/subscription`** (new file `src/pages/customer/Subscription.tsx`) — list `consumer_history_*` plans, current active subscription card, request-plan flow (the existing `requestPlan` insert into `subscription_requests`). This is the *only* place plans are shown.

Wire-up:
- Register the two new routes in `src/lib/app-routes.tsx` (or wherever customer routes live — confirm in `app-routes.tsx`).
- Add nav entries in `src/pages/customer/CustomerLayout.tsx`:
  - Desktop `NAV`: insert "ইতিহাস" (History icon) and "সাবস্ক্রিপশন" (Crown icon) after "আয়-ব্যয়".
  - Mobile `MOBILE_NAV`: keep 5 — replace "প্রোফাইল" only if needed; otherwise leave mobile unchanged and rely on profile menu link.
- Move `Plan` type, `loadPlans`, `loadSub`, `requestPlan`, `showPlans` dialog out of `Money.tsx` into `Subscription.tsx`.
- `History.tsx` imports `loadSub` to know gating; or call a shared helper in `src/lib/consumer-history-access.ts`.

No schema changes needed for any of the three items.
