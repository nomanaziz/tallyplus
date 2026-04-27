## লক্ষ্য

1. **Free plan** — সব user এর জন্য ১টি দোকান free, তবে feature-গুলোতে usage limit।
2. **Simplified plans** — শুধু ৩টি plan: মাসিক ৫০৳ (২ দোকান), বার্ষিক ৫০০৳ (৩ দোকান), Lifetime (৫টি দোকান)। সব price/discount admin panel থেকে control।
3. **Usage Limit page** — feature-wise limit + current usage + remaining (uploaded image অনুযায়ী design)। "Limit chart"-এ click করলে এই page-এ আসবে (এখন ভুল করে Reports-এ যাচ্ছে)।
4. **Promotional popup banner** — admin control থেকে on/off, দোকানদার login করলে এক বার দেখাবে।
5. **Recharge payment integration** — admin panel থেকে Recharge Server config (stub/placeholder, full integration documentation চাইলে দিতে হবে)।

---

## পরিবর্তনসমূহ

### ১) Database migration

**`subscription_plans` updates:**
- বর্তমান ৩টি plan replace করব নতুন ৩টি দিয়ে:
  - `monthly` — ৫০৳ / 30 days / max_shops 2
  - `yearly` — ৫০০৳ / 365 days / max_shops 3
  - `lifetime` — admin-set price (default 5000৳) / 36500 days / max_shops 5
- `subscription_plans` table-এ extra optional column যোগ:
  - `discount_pct numeric default 0` (admin discount)
  - `description_bn text`, `description_en text`
  - `perks jsonb` (bullet point list, admin editable)
  - `is_lifetime boolean default false`

**নতুন table `usage_limits` (admin-controlled):**
```text
plan_code text  (free / monthly / yearly / lifetime)
feature_key text  (purchase, sale, expense, products, due, contacts_customer, contacts_supplier, contacts_employee, stock)
limit_count int   (-1 = unlimited)
PK: (plan_code, feature_key)
```
Free plan-এর জন্য seed values uploaded screenshot-এর number অনুসারে: ক্রয় 10, বিক্রয় 10, খরচ 10, পণ্যের তালিকা 10, বাকি 8, যোগাযোগ-গ্রাহক 5, যোগাযোগ-সাপ্লায়ার 5, যোগাযোগ-কর্মচারী 1, স্টক তালিকা 10। Paid plans সব -1 (unlimited)।

**নতুন table `promo_popups`:**
```text
id uuid, title_bn, title_en, body_bn, body_en, image_url,
cta_text_bn, cta_text_en, cta_link, is_active bool, starts_at, ends_at,
created_at
```
RLS: admin write, authenticated read active ones।

**নতুন table `payment_gateway_settings`:**
```text
id (singleton), provider text default 'recharge_server',
api_url, api_key, merchant_id, is_enabled bool, extra jsonb
```
Admin-only access।

**`has_active_subscription` / `user_shop_limit` —** logic ঠিক আছে; free fallback ১টা দোকান (আগে থেকেই আছে)।

---

### ২) New page: Usage Limits — `src/pages/app/UsageLimits.tsx`

- Route: `/app/usage-limits`
- উপরের image অনুযায়ী design:
  - Header "ব্যবহারের সীমা" + subtitle
  - Table: ফিচার | সীমা | বর্তমান ব্যবহার (progress bar সহ) | অবশিষ্ট (color-coded: সবুজ <75%, হলুদ 75-89%, লাল 90%+)
  - Legend
  - নিচে "রেগুলার প্যাকেজ" cards (২টা: yearly, lifetime) — pricing/perks DB থেকে
  - Footer button "সকল সাবস্ক্রিপশন প্যাকেজ দেখুন →" → `/app/subscribe`
- Data fetch: current shop-এর জন্য counts (sales, purchases, expenses, products, customers, suppliers, employees, stock items) + active plan code → usage_limits।

**Limit chart click route fix:**
- `AppSidebar.tsx` / Dashboard-এ যেখানে "limit chart" item Reports-এ যাচ্ছে, সেটা `/app/usage-limits`-এ point করব।

**Limit enforcement (light touch):**
- Sale/Purchase/Expense/Product/Customer/Supplier/Employee/Stock create করার সময় free plan হলে count check করে limit cross করলে toast + redirect to `/app/usage-limits`। ঐ সব mutation point-এ একটা helper `assertWithinLimit(featureKey)` ব্যবহার করব।

---

### ৩) Subscribe page rewrite — `src/pages/app/Subscribe.tsx`

- Hard-coded plans সরাব। DB `subscription_plans` থেকে load।
- ৩টি card (Monthly / Yearly / Lifetime) — admin-set price, perks, discount badge সহ।
- Recharge Server payment button (placeholder: "এখনই কিনুন" → opens recharge gateway flow stub, success হলে subscription create)।

---

### ৪) Admin panel updates

**`src/pages/admin/Plans.tsx`** — extend existing form:
- Discount %, Perks (textarea, line-per-perk), description fields যোগ।

**নতুন `src/pages/admin/UsageLimits.tsx`:**
- Per-plan, per-feature limit editor (table grid)। -1 = unlimited।

**নতুন `src/pages/admin/PromoPopups.tsx`:**
- CRUD (image upload, title, body, CTA, schedule, active toggle)।

**নতুন `src/pages/admin/PaymentGateway.tsx`:**
- Recharge Server settings form (api_url, api_key, merchant_id, enabled toggle)।
- যেহেতু আমার কাছে Recharge Server-এর exact API documentation নেই, এই page form + secret save করবে এবং subscribe checkout-এ একটা stub call করবে। **আপনি Recharge Server documentation শেয়ার করলে সম্পূর্ণ integration (token request, webhook verify ইত্যাদি) এই plan-এর পরের step-এ যোগ করব।**

`AdminSidebar.tsx`-এ ৩টি নতুন link।

---

### ৫) Promotional popup display

**নতুন component `src/components/app/PromoPopupDialog.tsx`:**
- AppLayout mount-এ active promo fetch → session-এ আগে দেখানো হয়েছে কিনা localStorage check (`tp_promo_seen_<id>`) → না হলে dialog show।
- Image, title, body, CTA button (link follow), close button।

`AppLayout.tsx`-এ mount।

---

### ৬) Backward compatibility

- Old plan rows (current 3) seed migration-এ update via `INSERT ON CONFLICT (code) DO UPDATE`। যাদের active subscription আছে তারা যেহেতু `plan_id` দিয়ে link, plan rename হলেও কাজ করবে।
- `user_shop_limit()` function পরিবর্তন করতে হবে না।

---

## Out of scope (এই plan-এ নেই)
- Recharge Server-এর actual webhook/callback handling — documentation পেলে যোগ করব।
- Email/SMS notification।
- App slowness আরও optimization (আগের turn-এ lazy loading + prefetch হয়েছে)।

## প্রশ্ন
আপনার কাছে কি Recharge Server-এর API documentation আছে? থাকলে শেয়ার করুন — তাহলে stub-এর বদলে real payment flow + webhook verify implement করব।
