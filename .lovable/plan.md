## লক্ষ্য

একজন মালিকের একাধিক দোকান থাকতে পারবে। প্রতিটি দোকানের আলাদা হিসাব, আলাদা কর্মচারী access, আলাদা subscription। Subscription কয়টা দোকানের জন্য — তার উপর দাম নির্ভর করবে। Login-এর পর user দোকান select করবে; settings থেকে যেকোনো সময় দোকান পরিবর্তন করা যাবে।

---

## Concept overview

- **Primary দোকান** = signup-এ দেওয়া দোকান (user-এর প্রথম shop, `created_at` সবচেয়ে পুরানো)।
- User চাইলে নতুন দোকান add করতে পারবে — কিন্তু **আলাদা subscription কিনতে হবে** সেই অতিরিক্ত দোকানের জন্য।
- প্রতিটি দোকানে আলাদা `shop_members` (কর্মচারী) থাকবে — যা already DB-তে সাপোর্ট করা আছে।
- Subscription এখন **per-shop** হবে (এখন user-level আছে, সেটা change হবে)।

---

## Batch 1 — Database changes (migration)

### 1. `shop_subscriptions` নতুন table
`subscriptions` table user-level আছে — এটা রেখেই **নতুন `shop_subscriptions`** table যোগ করব যাতে প্রতিটি দোকানের জন্য আলাদা subscription থাকে।

```
shop_subscriptions(
  id, shop_id (FK shops, unique constraint),
  plan_id (FK subscription_plans),
  status, starts_at, expires_at,
  created_at, updated_at
)
```
RLS: shop owner বা admin read; admin write।

### 2. `subscription_requests`-এ `shop_id` যোগ
যাতে user যখন subscription কিনে, কোন দোকানের জন্য কিনছে সেটা বলা যায়।

### 3. Helper function
`public.shop_has_active_subscription(_shop_id uuid) returns boolean`

---

## Batch 2 — Shop selector page (login-এর পরে)

নতুন route: **`/app/select-shop`**

হিসাবী-এর `/shop` page-এর মতো দেখতে হবে (uploaded reference image অনুসারে):

```text
        [Logo]   দোকান সিলেক্ট করুন

   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  🏪 icon │  │  🏪 icon │  │  ➕ icon │
   │ Shop A   │  │ Shop B   │  │  নতুন    │
   │ address  │  │ address  │  │  দোকান   │
   │[সিলেক্ট] │  │[সিলেক্ট] │  │ যুক্ত    │
   └──────────┘  └──────────┘  └──────────┘
```

- Top-right: **লগআউট** button
- প্রতিটি card-এ: shop icon/logo, নাম, ঠিকানা, **সিলেক্ট করুন** button
- শেষে **+ নতুন দোকান যুক্ত করুন** card → "Add shop" dialog খোলে
- Active/current shop সবুজ border দিয়ে highlight হবে
- Shop select করলে `localStorage.tp_shop_id` সেট করে `/app/dashboard`-এ যাবে

### Login flow update
`auth.tsx` finishLogin-এ:
- যদি user-এর shop > 1 → `/app/select-shop`
- যদি ঠিক 1 → সরাসরি `/app/dashboard`
- যদি 0 → বর্তমান "Setup shop" prompt (`app.tsx`)

Single-shop user-দের কোনো বাড়তি click লাগবে না।

---

## Batch 3 — "দোকান পরিবর্তন করুন" (Settings থেকে)

`AppTopbar` settings dropdown-এ একটা item যোগ করব: **↔ দোকান পরিবর্তন করুন** → `/app/select-shop`-এ নিয়ে যাবে।

User profile dropdown-এও current shop name show করবে (image-12 reference)।

---

## Batch 4 — Add shop dialog (subscription gate সহ)

`/app/select-shop`-এর "+ নতুন দোকান" বা settings থেকে নতুন দোকান add করতে গেলে:

1. Shop name + address + phone input
2. Submit করলে → first check: এই user-এর কয়টা active shop subscription আছে?
3. যদি নতুন দোকানের জন্য active subscription না থাকে → toast: *"নতুন দোকানের জন্য সাবস্ক্রিপশন কিনুন"* + redirect to `/app/subscribe?for=new-shop`
4. Subscription থাকলে → `shops`-এ insert + `shop_subscriptions`-এ link

Primary (প্রথম) দোকান free হিসেবে গণ্য হবে যদি default plan থাকে — না হলে signup-এর সময়ও plan select করতে হবে। **আমরা MVP-তে: প্রথম দোকান free trial (7 days), পরের প্রতিটি দোকান paid** — এই rule দিয়ে শুরু করব।

---

## Batch 5 — Subscribe page update

`/app/subscribe`:
- উপরে দেখাবে: **এই subscription কোন দোকানের জন্য?** — current shop dropdown/selector
- প্রতিটি plan card-এ "এই দোকানের জন্য কিনুন" button
- Submit → `subscription_requests`-এ insert with `shop_id` + `plan_id`
- Admin approve করলে `shop_subscriptions`-এ row তৈরি হবে

---

## Batch 6 — Per-shop access (already supported)

`shop_members` table আগে থেকেই `shop_id`-based, তাই **App Access page (Batch A-তে already করা)** auto-correct — current selected shop-এর members দেখাবে।

---

## Technical details

**Files to edit/create:**
- `supabase/migrations/<new>.sql` — `shop_subscriptions` table + RLS + helper function + add `shop_id` to `subscription_requests`
- `src/routes/app.select-shop.tsx` (new) — shop picker page
- `src/routes/app.tsx` — login flow conditional redirect to select-shop
- `src/lib/shop.tsx` — expose `addShop()` + subscription check helper
- `src/lib/subscription.tsx` (new) — `useShopSubscription(shopId)` hook
- `src/components/app/AppTopbar.tsx` — "দোকান পরিবর্তন করুন" link in dropdown, current shop label
- `src/routes/app.subscribe.tsx` — shop selector + per-shop purchase flow
- `src/routes/auth.tsx` — finishLogin redirects to `/app/select-shop` if shops > 1

**Backwards compatibility:** existing `subscriptions` (user-level) row থাকলে সেটা first/primary shop-এর জন্য valid ধরা হবে — migration-এ existing user subscriptions auto-link হবে user-এর oldest shop-এ।

---

## Execution order

1. **Batch 1** — DB migration (shop_subscriptions + auto-link + helper)
2. **Batch 2** — `/app/select-shop` page + login redirect
3. **Batch 3** — Topbar "দোকান পরিবর্তন করুন" + current shop label
4. **Batch 4** — Add-shop dialog with subscription gate
5. **Batch 5** — Subscribe page per-shop flow

প্রতি batch-এর পর build verify করব।

Approve করলে **Batch 1 (DB migration)** থেকে শুরু করব।