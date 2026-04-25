
# Shop Type + Global Product Catalog — Plan

দুটো related জিনিস একসাথে করব:
1. **Shop type** — সাইনআপের সময় দোকানদার দোকানের ধরন বাছাই করবেন (pharmacy, grocery, electronics ইত্যাদি)।
2. **Global product catalog** — admin আগে থেকে বিশ্বব্যাপী পণ্যের নাম (বাংলা+ইংলিশ), দাম, ছবি, category, unit লিখে রাখবেন। দোকানদার product add করার সময় বা গ্রাহক ফর্দ লেখার সময় ২ অক্ষর type করলেই autocomplete suggest করবে।

---

## 1. Shop type system

### Database
নতুন table `public.shop_types` — admin-managed list, যেগুলো signup-এ dropdown হিসেবে দেখাবে।

```text
shop_types
- id uuid pk
- code text unique           -- e.g. "pharmacy", "grocery", "electronics"
- name_bn text                -- "ফার্মেসি"
- name_en text                -- "Pharmacy"
- icon text                   -- lucide icon name বা emoji
- default_categories text[]   -- e.g. ['Medicine', 'Baby Care', 'Cosmetics']
- sort_order int default 0
- is_active boolean default true
```

`public.shops` table-এ `shop_type_code text references shop_types(code)` (nullable, যাতে existing shop break না হয়)।

RLS:
- Public SELECT (signup-এ unauthenticated user-ও দরকার পাবে)
- Admin only INSERT/UPDATE/DELETE

### Seed data (১২টা common type)
Pharmacy, Grocery (মুদি), Electronics, Mobile/Accessories, Stationery, Cosmetics, Clothing, Hardware, Restaurant/Food, Bakery, Vegetable/Fish (কাঁচাবাজার), General Store।

প্রতিটা type-এ default categories (এই category-গুলো নতুন shop create হলে auto seed হবে `categories` table-এ — এতে দোকানদার শূন্য থেকে শুরু করতে হবে না)।

### UI changes
- **Shop create dialog** (`src/routes/app.tsx`-এর "setup shop" screen এবং Shop switcher-এর "new shop"): শপ নামের নিচে "দোকানের ধরন" dropdown যোগ করব — search-able list, প্রতিটা option-এ icon + bn/en নাম।
- **Existing shops**: Shop settings-এ shop type পরিবর্তন করার option (Settings page পরের iteration; এখন signup-এ নতুন shop-এর জন্য active)।
- **Admin** → নতুন route `/admin/shop-types` — CRUD interface (sidebar-এ "Shop Types" entry)।

### Effect on Global Catalog filtering
Global product catalog-এ প্রতিটা item-এর `shop_types text[]` থাকবে — যেমন "Paracetamol" → `['pharmacy']`, "Coca-Cola" → `['grocery', 'restaurant']`, "USB Cable" → `['electronics', 'mobile']`। দোকানদারের shop type অনুযায়ী suggestion filter হবে যাতে pharmacy-তে USB cable suggest না করে।

---

## 2. Global Product Catalog

আমাদের ইতিমধ্যে `marketplace_products` table আছে (last iteration-এ বানানো canonical product list)। আমি এটাকেই **extend** করব — duplicate table বানাব না। নতুন column যোগ করব আর সেটাকে দুই purpose-এ ব্যবহার করব:

1. Admin reference catalog (autocomplete source for shop owners + customer wishlist)
2. Marketplace listing (যেটা আগে plan ছিল)

### Schema updates to `marketplace_products`
নতুন columns:
- `default_price numeric` — admin-set typical retail price (BDT)
- `default_cost numeric` — typical wholesale price (optional)
- `brand text` — e.g. "Square", "ACI", "Pran"
- `pack_size text` — e.g. "500 mg", "1 L", "100 g"
- `barcode text` — যদি admin জানে
- `shop_types text[] default '{}'` — কোন shop type-এ relevant
- `search_text text` (generated column / trigger) — name_bn + name_en + brand + barcode সব lower-case concat, autocomplete-এর জন্য GIN index

Index: `gin (search_text gin_trgm_ops)` দিয়ে fast 2-character "ILIKE %পে%" search। (`pg_trgm` extension enable করব)।

### Admin UI updates (`/admin/marketplace` Products tab)
বর্তমান product editor-এ নতুন field যোগ:
- Brand, pack_size, barcode
- Default price + Default cost
- Shop types multi-select (chip picker — pharmacy, grocery, ইত্যাদি)
- Bulk import (CSV) — দ্রুত হাজার product add করার জন্য (drag-drop CSV → preview → import)
- Bulk image upload via URL OR direct upload to existing `product-images` storage bucket

### Autocomplete component (reusable)
নতুন component: `src/components/app/CatalogProductPicker.tsx`

```text
┌──────────────────────────────────┐
│ পণ্যের নাম লিখুন...   🔍         │
└──────────────────────────────────┘
   ↓ user types "পে"
┌──────────────────────────────────┐
│ 🖼 পেপসি ৫০০মিলি   ৳ ৬০   মুদি  │
│ 🖼 পেনাডল ৫০০মিগ্রা ৳ ১২ ফার্মেসি│
│ 🖼 পেন (বল)        ৳ ১০   স্টেশনারি│
│ ────────────────────────────────  │
│ + নতুন পণ্য তৈরি করুন: "পে"      │
└──────────────────────────────────┘
```

Behavior:
- 2 characters typed → debounced query (250ms) → `marketplace_products` ILIKE search on `search_text`, optionally filtered by current shop's `shop_type_code`
- Each suggestion shows: image thumbnail, bn+en name, default price, brand, shop_type badge
- Select → callback returns full product (name, price, unit, category, image_url, barcode)
- "+ নতুন পণ্য তৈরি করুন" — যদি কিছু match না করে, free-text হিসেবে ব্যবহার করার option

### Where the picker is used

1. **Shop owner — Add Product** (`/app/products` form):
   - Name field becomes a CatalogProductPicker
   - Select করলে name, sale_price (=default_price), cost_price, unit, image, category auto-fill হবে
   - শুধু সেই দোকানের জন্য `products` table-এ insert হবে (existing flow), catalog-এ কিছু লেখে না
   - নতুন product হলে free-text → আগের মতোই manual entry

2. **Customer Wishlist** (`/f/$slug`):
   - প্রতিটা item row-এ name input → CatalogProductPicker হবে
   - গ্রাহক "চা" type করলে suggest হবে: "চা পাতা ৫০০গ্রাম", "টি-ব্যাগ ১০০ পিস" ইত্যাদি
   - এতে গ্রাহক spelling ভুল কম করবে এবং দোকানদার পরিচিত নাম পাবে
   - Wishlist shop-এর `shop_type_code` দিয়ে filter হবে (pharmacy হলে pharmacy item-ই দেখাবে)
   - **Public access**: এই endpoint-টা JWT ছাড়া call হয়, তাই RLS-এ `marketplace_products` public read already আছে — extra কিছু লাগবে না। কিন্তু shop_type filter-এর জন্য shop info-র সাথে type-ও আসবে (`wishlist-shop-info` edge function update করব)।

3. **Quick Sell / POS** (`/app/sell`, `/app/quick-sell`): existing product search এখন থেকে shop-এর own products খুঁজবে, কিন্তু "result না পেলে catalog থেকে দেখান" toggle থাকবে যাতে দোকানদার catalog থেকে instant add করে sell করতে পারে।

---

## 3. Admin reference catalog improvements

`/admin/marketplace` → Products tab-এ নতুন tools:
- **Filter bar**: search, shop_type, category, brand, active/inactive
- **CSV import** dialog (drag CSV with columns: name_bn, name_en, brand, pack_size, default_price, category, shop_types_csv, image_url, barcode)
- **CSV export** of all products
- **Bulk actions**: select multiple → activate/deactivate / set shop_type / delete
- **Stats card** at top: total products, by category, by shop_type

Admin sidebar-এ নতুন separate entry "Catalog" দেব না — এটা Marketplace-এর ভিতরেই Products tab হিসেবে থাকবে (যা ইতিমধ্যে আছে), কিন্তু renamed: "Master Catalog"। Marketplace listings আগের মতোই থাকবে।

---

## 4. Customer wishlist edge function update

`supabase/functions/wishlist-shop-info/index.ts` — response-এ `shop_type_code` যোগ করব যাতে public wishlist page autocomplete-কে সঠিকভাবে filter করতে পারে।

---

## Technical details

### Migrations (one combined migration)
1. `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
2. Create `shop_types` table + RLS + seed 12 default types
3. Add `shop_type_code` column to `shops`
4. Add new columns to `marketplace_products`: brand, pack_size, barcode, default_price, default_cost, shop_types, search_text
5. Trigger to maintain `search_text` from name_bn/name_en/brand/barcode on insert/update
6. GIN trigram index on `search_text`
7. Backfill `search_text` for existing rows

### New files
- `src/routes/admin.shop-types.tsx` — admin CRUD for shop types
- `src/components/app/CatalogProductPicker.tsx` — reusable autocomplete
- `src/components/app/ShopTypePicker.tsx` — dropdown component for shop create
- `src/lib/catalogSearch.ts` — debounced search query helper

### Modified files
- `src/components/admin/AdminSidebar.tsx` — "Shop Types" entry
- `src/routes/admin.marketplace.tsx` — extended product editor, CSV import, filters
- `src/routes/app.tsx` — shop-create form gets ShopTypePicker
- `src/routes/app.products.tsx` — name field uses CatalogProductPicker; auto-fill on select
- `src/routes/f.$slug.tsx` — item rows use CatalogProductPicker (filtered by shop type)
- `supabase/functions/wishlist-shop-info/index.ts` — return shop_type_code

### Out of scope (পরের iteration)
- Existing shop-এর জন্য Settings page থেকে shop type পরিবর্তন (এখন শুধু signup/new shop-এ আসবে)
- Multi-language search beyond bn+en (e.g. Hindi)
- AI-suggested shop_types tagging on bulk import
- Image upload UI (এখন admin URL paste করবে; পরে storage uploader যোগ করব)

---

**একটা confirmation প্রয়োজন:**

- **Catalog selection দিয়ে Shop product add করার সময় price আচরণ** — admin-এর `default_price` শুধু *suggestion* হবে (দোকানদার change করতে পারবে), নাকি *locked* হবে? আমার suggestion: শুধু prefill (suggestion), কারণ একই পণ্য বিভিন্ন দোকানে আলাদা দামে বিক্রি হয়। OK?
