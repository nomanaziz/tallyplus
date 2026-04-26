## Plan: Label fix, Sidebar cleanup, এবং B2B (পাইকারি) Module

তিনটা আলাদা কাজ একসাথে — ছোট থেকে বড় পর্যন্ত।

---

### 1) Label fix (ছোট কাজ)
`src/routes/app.quick-order.tsx`-এ "দোকানের বাইরের পণ্য" → **"স্টকের বাইরের পণ্য"** করা হবে। English label "External items" রাখব (বা "Out-of-stock items")।

---

### 2) Sidebar restructure
`src/components/app/AppSidebar.tsx`-এ দুইটা পরিবর্তন:

- **দ্রুত ফর্দ** (`/app/quick-order`) — এখন "লেনদেন" section-এ আছে। সরিয়ে **"গ্রাহক ও যোগাযোগ"** section-এ "গ্রাহক ফর্দ"-এর কাছে নিয়ে আসা হবে।
- **প্রোডাক্ট রিটার্ন** (`/app/returns`) — এখন "হিসাবের খাতা" section-এ আছে। সরিয়ে **"পণ্য ও স্টক"** section-এ নিয়ে আসা হবে।

কোনো route URL বদলাবে না — শুধু sidebar grouping।

---

### 3) B2B (পাইকারি) Module — বড় feature

**ধারণা:** একই app-এ দুই ধরনের ব্যবসায়ী থাকবে:
- **খুচরা বিক্রেতা (Retail)** — বর্তমান default behavior
- **পাইকারি বিক্রেতা (Wholesale)** — extra B2B-specific options

খুচরা দোকানদাররা পাইকারি দোকানদারদের কাছে **B2B ফর্দ** পাঠাতে পারবে — ঠিক যেমন consumer ফর্দ পাঠায়, তেমন।

---

#### ৩.১ Setting toggle: "আপনি কি পাইকারি বিক্রেতা?"

- Shop settings page-এ একটা toggle: `is_wholesale` (default `false`)
- DB migration: `shops` table-এ নতুন column `is_wholesale boolean default false` যোগ
- Toggle on করলে shop B2B mode-এ চলে যাবে — নিচের সব পাইকারি features unlock হবে

#### ৩.২ Product-level পাইকারি setting

`products` table-এ ইতিমধ্যে আছে:
- `bulk_enabled boolean`
- `bulk_min_qty numeric`
- `bulk_price numeric`

Wholesale shop হলে product form-এ এই fields আরো prominent করা হবে — "পাইকারি বিক্রির minimum quantity" + "পাইকারি দাম" required দেখাবে। খুচরা shop হলে আগের মতই optional থাকবে।

#### ৩.৩ Marketplace-এ wholesale vendor আলাদা দেখানো

- Marketplace vendor list (`/shop`)-এ filter chip যোগ হবে: **"সব / খুচরা / পাইকারি"**
- পাইকারি vendor card-এ একটা **"পাইকারি"** badge দেখাবে
- পাইকারি shop-এর product card-এ price-এর জায়গায় পাইকারি দাম + min qty দেখাবে (e.g., "৳৪৫০/ডজন · সর্বনিম্ন ১ ডজন")

#### ৩.৪ B2B ফর্দ — খুচরা থেকে পাইকারি-তে

পাইকারি shop-এর vendor page-এ **"B2B ফর্দ পাঠান"** button থাকবে (consumer ফর্দ-এর পাশাপাশি)। B2B ফর্দ আলাদা flag দিয়ে চিহ্নিত হবে — যাতে পাইকারি shop-এর dashboard-এ B2B vs consumer ফর্দ আলাদা tab-এ দেখানো যায়।

DB change:
- `customer_wishlists` table-এ নতুন column `is_b2b boolean default false`
- `buyer_shop_id uuid` (যে দোকান অর্ডার পাঠাচ্ছে তার shop_id, nullable — consumer হলে null)

পাইকারি shop-এর "গ্রাহক ফর্দ" page-এ দুইটা tab:
- **Consumer ফর্দ** (পুরাতন behavior)
- **B2B ফর্দ** (অন্য shop থেকে আসা — buyer shop-এর নাম + ফোন দেখাবে)

#### ৩.৫ B2B order flow simplification

খুচরা shop owner যখন logged-in অবস্থায় কোনো পাইকারি vendor-এর page থেকে ফর্দ পাঠাবে:
- Auto-fill: shop name → customer_name, owner phone → customer_phone, shop address → customer_address
- `is_b2b = true`, `buyer_shop_id = current shop id` set হবে
- পাইকারি দাম apply হবে items-এ (যেখানে `bulk_enabled`)

---

### Phasing (যেহেতু বড় কাজ)

আমি একসাথে সব করব — কিন্তু যদি কোনো অংশ পরে refine করতে চান:

- **Phase A (এই turn-এ):** Label fix + Sidebar restructure + DB migration (`is_wholesale`, `is_b2b`, `buyer_shop_id`) + Settings toggle + Marketplace wholesale filter/badge
- **Phase B (পরে):** B2B ফর্দ পাঠানোর full flow (auto-fill, পাইকারি দাম apply, পাইকারি shop-এ B2B tab) — Phase A approve হওয়ার পর

আমি **Phase A** দিয়ে শুরু করব, কারণ Phase B-এর জন্য আগে foundation দরকার এবং একসাথে অনেক বদল testing-এ ঝামেলা হবে।

---

### Files to be created/modified (Phase A)

**Modify:**
- `src/routes/app.quick-order.tsx` — label fix
- `src/components/app/AppSidebar.tsx` — দ্রুত ফর্দ ও প্রোডাক্ট রিটার্ন relocate
- `src/routes/app.online-shop.settings.tsx` (or shop settings page) — `is_wholesale` toggle
- `src/routes/shop.index.tsx` — wholesale filter chip + badge
- `src/components/marketplace/VendorCard.tsx` (or equivalent) — পাইকারি badge
- `supabase/functions/marketplace-public/index.ts` — `is_wholesale` field expose

**DB Migration:**
- `shops.is_wholesale boolean default false`
- `customer_wishlists.is_b2b boolean default false`
- `customer_wishlists.buyer_shop_id uuid nullable`

কোনো নতুন route file বা edge function লাগছে না Phase A-তে।