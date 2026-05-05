## Customer subscription — Recharge gateway, না manual request

### সমস্যা

এখন `src/pages/customer/Subscription.tsx`-এ subscribe করতে গেলে শুধু `subscription_requests` table-এ একটা pending row insert হয় — admin manually approve না করা পর্যন্ত কিছুই হয় না। Shop subscription (`src/pages/app/Subscribe.tsx`)-এ অনলাইন payment gateway (Recharge Server) আছে, তাত্ক্ষণিক active হয়। Consumer-এ একই system দরকার।

পাশাপাশি payment attempts (failed সহ), subscriptions, ও shop ownership transfers — এই তিনটার জন্য already-existing infra reuse করতে হবে, নতুন কিছু না।

### সমাধান

Consumer subscription-কে shop subscribe-এর মতই দুটো option দেব:
1. **অনলাইন পেমেন্ট** — Recharge Server (instant active)
2. **ম্যানুয়াল পেমেন্ট** — bKash/Nagad TxnID submit, admin verify (existing flow)

সব কিছুই existing tables (`payment_transactions`, `subscriptions`, `subscription_requests`) ও existing edge functions reuse করবে। Admin-এর **Payment Attempts**, **Subscriptions**, **Transfers** page-এ consumer subscription গুলোও আসবে কারণ same tables।

### ১. Edge function reuse / minor change

`recharge-create-payment` (existing) — ইতিমধ্যে যেকোনো plan_id accept করে, consumer plans (`consumer_history_*`) সহ। কিছু পরিবর্তন লাগবে কিনা check করব:
- `subscription_plans` filter — consumer plans-এও `is_active=true` থাকলে allow করছে। ✅
- success/cancel URL — consumer-এর জন্য আলাদা callback route লাগবে: `/customer/subscribe/callback` (নতুন, optional `redirect_to` parameter দিয়েও করা যায়)। সহজ approach: function-এ `redirect_path` body param যোগ, না দিলে default `/app/subscribe/callback`।

`recharge-verify-payment` — already plan code দেখে `subscriptions` row insert/update করে; consumer plans automatically handle হবে।

`recharge-mark-failed` — same, no change।

### ২. নতুন callback route (consumer)

`src/pages/customer/SubscribeCallback.tsx` — `src/pages/app/SubscribeCallback.tsx`-এর consumer version (success হলে `/customer/subscription`-এ redirect, layout consumer-এর)।

Route registration: `src/lib/app-routes.tsx`-এ `/customer/subscribe/callback` যোগ।

### ৩. `src/pages/customer/Subscription.tsx` redesign

বর্তমান "আবেদন করুন" button-এর জায়গায় shop Subscribe page-এর pattern হুবহু copy:
- Plan card-এ "নির্বাচন করুন" button
- নিচে step-2 panel: "অনলাইন পেমেন্ট" / "ম্যানুয়াল পেমেন্ট" choice
- Online → `recharge-create-payment` invoke (with `redirect_path: "/customer/subscribe/callback"`), gateway URL-এ redirect
- Manual → existing `subscription_requests` insert (payment_method, txn_id, admin_note সহ — যেমন shop flow করে)
- `payment_methods` table থেকে active methods load (shop flow-এ আছে)
- `payment_gateway_public` RPC দিয়ে gateway enabled কিনা check; disabled হলে শুধু manual show

### ৪. Admin-side already covered

কোনো change লাগবে না:
- `src/pages/admin/PaymentAttempts.tsx` — `payment_transactions` table দেখায়, consumer recharge attempts automatic দেখাবে (provider=`recharge_server`, plan code দিয়ে চিনবে)
- `src/pages/admin/Subscriptions.tsx` — সব active subscriptions দেখায়, consumer plan-গুলোও আসবে
- `src/pages/admin/SubscriptionRequests.tsx` — manual request সব দেখায়, consumer-গুলোও আসবে
- `src/pages/admin/Transfers.tsx` — shop transfer flow, যেমন আছে তেমন (এটা already gateway integrated)

কেবল ভাল UX-এর জন্য PaymentAttempts table-এ plan label/badge-এ "Consumer" vs "Shop" indicator দেখানো যেতে পারে — plan code prefix (`consumer_history_`) দেখে। ছোট cosmetic addition।

### ৫. Files

**নতুন:**
- `src/pages/customer/SubscribeCallback.tsx`

**Edit:**
- `supabase/functions/recharge-create-payment/index.ts` — optional `redirect_path` body param accept (default existing behaviour)
- `src/pages/customer/Subscription.tsx` — full redesign (plan grid + pay-step panel)
- `src/lib/app-routes.tsx` — register `/customer/subscribe/callback`
- `src/pages/admin/PaymentAttempts.tsx` — small "Consumer/Shop" badge based on plan code (cosmetic)

### ৬. কেন migration লাগছে না

`payment_transactions`, `subscriptions`, `subscription_requests`, `subscription_plans`, `payment_methods` — সব ইতিমধ্যে exist করে এবং plan_id দিয়ে consumer plans handle করতে পারে। সম্পূর্ণ code-only change।

Approve করলে edge function update আগে, তারপর consumer page + callback + route + admin badge — এক সাথেই।