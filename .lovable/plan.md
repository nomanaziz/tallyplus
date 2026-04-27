## Problem

Home page-এর `PricingSection` সম্পূর্ণ hard-coded — ভেতরে `PLANS` array লেখা আছে (Monthly ৳299, Half-yearly ৳1499, Yearly ৳2499, Lifetime ৳5000), যেগুলো admin-এর Plans page (`/admin/plans` → DB table `subscription_plans`)-এ যা সেট করা আছে তার সাথে মিলছে না। Admin যা edit করেন সেটা home page-এ আসে না।

পাশাপাশি, "Get started" button শুধু `/auth`-এ পাঠায় — actual recharge online payment (যেটা ইতিমধ্যে `/app/subscribe`-এ কাজ করছে via `recharge-create-payment` edge function) এখান থেকে trigger হয় না।

## Goal

Home page-এর pricing section-কে fully dynamic করা — admin যেগুলো `subscription_plans` table-এ active রাখেন সেগুলোই দেখাবে, এবং login করা owner user button-এ click করলে যেখানে সম্ভব সেখানে সরাসরি online recharge payment শুরু হবে; না হলে Subscribe page-এ চলে যাবে যেখানে manual payment করা যায়।

## Changes

### 1. `src/components/site/PricingSection.tsx` — DB-driven rewrite

- পুরো hard-coded `PLANS` array সরিয়ে দাও।
- Mount হলে দুটো query করো:
  - `supabase.from("subscription_plans").select("id,code,name_bn,name_en,price_bdt,old_price_bdt,duration_days,max_shops,is_lifetime,perks,description_bn,description_en,discount_pct").eq("is_active", true).order("price_bdt")`
  - `supabase.from("payment_gateway_settings").select("is_enabled").eq("id", true).maybeSingle()` — online payment চালু কিনা জানার জন্য।
- Loading state দেখাও (skeleton বা spinner)। Plans খালি/error হলে friendly message: "শীঘ্রই প্ল্যান প্রকাশ হবে" + WhatsApp/Subscribe page link।
- প্রতিটা plan card-এ `Subscribe` page-এর মতো একই data দেখাও:
  - Name (lang অনুযায়ী), final price = `discount_pct ? round(price_bdt * (1 - discount_pct/100)) : price_bdt`, strikethrough `old_price_bdt` যদি থাকে এবং `> final`, duration/max_shops, description, perks list।
  - "Lifetime" plan-এ `is_lifetime` দেখে badge ও infinity icon, top-priced plan (last after sort) auto-highlight।
- Free plan card সবসময় প্রথমে দেখাও (যেমনটা `/app/subscribe`-এ আছে) — ৳0 / forever, ১টি দোকান, FREE_LIMITS_BN/EN string।
- Button behaviour:
  - User logged out → `/auth` (existing behaviour)।
  - User logged in + `gatewayEnabled` true + plan paid → call `supabase.functions.invoke("recharge-create-payment", { body: { plan_id, origin: window.location.origin, phone: user.phone ?? user.email ?? "" } })` → success হলে `window.location.href = data.payment_url`; error/no url হলে toast দেখাও + `/app/subscribe`-এ পাঠাও।
  - User logged in + gateway disabled → সরাসরি `/app/subscribe`-এ পাঠাও (সেখানে manual payment + plan selection আছে)।
  - Free plan card-এর button → logged in হলে `/app/dashboard`, না হলে `/auth`।
- Reuse `Subscribe.tsx`-এর patterns (একই query, একই finalPrice formula) যাতে দুই page-এ ১০০% consistent থাকে।

### 2. কোনো DB / migration / edge function পরিবর্তন দরকার নেই

`subscription_plans`, `payment_gateway_settings`, `recharge-create-payment` সব ইতিমধ্যে আছে এবং `Subscribe` page-এ কাজ করছে। আমরা শুধু home page-কে একই পথে hook করছি।

### 3. বিদ্যমান behaviour যা থাকছে

- `/pricing` route → এখনো `/#pricing`-এ redirect করে (কোনো বদল নেই)।
- "৭ দিনের ফ্রি ট্রায়াল" badge এবং "৭ দিন money-back guarantee" footer line — থাকছে।

## Out of scope

- Admin Plans page-এ কোনো বদল না (ইতিমধ্যে কাজ করছে)।
- Payment gateway settings UI-তে বদল না।
- Manual payment UI home page-এ যোগ করা হবে না — সেটা `/app/subscribe`-এ থাকবে (চাইলে user "Subscribe" button-এ click করে সেখানে যাবে)।
