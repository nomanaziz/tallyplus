## দুইটা পরিবর্তন

### 1) Marketplace Category / Subcategory fields — কাজ করানো (delete নয়)

**বর্তমান অবস্থা:** Admin → Marketplace Categories module-এ tree আছে, এবং admin → Marketplace (curated catalog) product edit dialog-এ dropdown আছে। কিন্তু **seller-এর নিজের product form-এ (`src/pages/app/Products.tsx` → `ProductFormDialog`) এই fields নেই** — তাই seller যে product online-এ publish করে, সেটা marketplace-এ category-wise filter হয় না। Customer browse page (`/shop`)-এ products tab-এ category filter-ও নাই (শুধু services tab-এ আছে)।

**Plan:**
- `ProductFormDialog`-এ "Online sell" toggle-এর কাছাকাছি দুইটা select যোগ করব:
  - **Marketplace Category** (top-level `marketplace_categories` rows)
  - **Subcategory** (selected category-র children)
- `products` table-এ ইতিমধ্যে `category_id` ও `sub_category_id` columns আছে — শুধু marketplace tree-র id store করব। Save payload-এ এগুলো আছে already; শুধু UI বসাতে হবে।
- `marketplace-publish` flow-এ এই দুইটা id `marketplace_listings`/listing payload-এ pass হবে যাতে browse page filter কাজ করে।
- **Customer browse (`/shop` products tab):** sidebar-এ "ক্যাটাগরি" filter যোগ করব (services-এর মতো) যা `marketplace_categories` থেকে আসবে এবং `marketplace-public` list-products edge function-এ `category_id` filter pass করবে।
- Edge function (`supabase/functions/marketplace-public/index.ts`)-এর product list query-তে `category_id` filter logic যোগ করব।

### 2) Brand / Company name — seller-এর জন্য

**Plan:**
- নতুন table `product_brands`:
  ```
  id uuid pk, name text, name_bn text null,
  shop_id uuid null references shops(id) on delete cascade,
  is_global boolean default false,
  created_by uuid null, created_at timestamptz
  unique(coalesce(shop_id::text,'global'), lower(name))
  ```
  - `shop_id NULL + is_global = true` → admin-defined default brand (সবার দেখা যাবে)
  - `shop_id = X` → শুধু সেই shop-এর custom brand
- RLS:
  - SELECT: `is_global = true OR shop_id IN (user's shops)`
  - INSERT: admin (global only) OR shop owner/staff (own shop only)
  - DELETE/UPDATE: same as insert
- `products` table-এ `brand text null` column যোগ করব (denormalized — name save হবে, id না, যাতে rename simple)।
- **Admin module:** `src/pages/admin/MarketplaceCategories.tsx`-এর pattern-এ একটা নতুন page `src/pages/admin/Brands.tsx` — admin global brand list manage (add/edit/delete, search bar, bulk delete)। Sidebar-এ link।
- **Seller product form:** Brand input-কে একটা **Combobox** বানাবো (existing `CategoryCombobox` pattern-এ): global + own-shop brands suggest করবে, সাথে free-type "+ যোগ করুন" option — typed value নতুন হলে auto-insert হবে `product_brands` (shop scope) এবং product-এ name save হবে।
- Bilingual placeholder: "ব্র্যান্ড / কোম্পানি (optional)"।

## Files

**Migration:**
- `product_brands` table + RLS policies + unique index
- `products.brand text null` column

**New:**
- `src/pages/admin/Brands.tsx` (admin CRUD)
- `src/components/app/BrandCombobox.tsx` (seller picker, suggest+create)

**Edit:**
- `src/pages/app/Products.tsx` — `ProductFormDialog`-এ Brand field + Marketplace Category/Subcategory selects; save payload-এ brand
- `src/pages/shop/Index.tsx` — products tab sidebar-এ category filter
- `supabase/functions/marketplace-public/index.ts` — product list-এ `category_id` filter
- `src/lib/marketplace-publish.ts` — category_id/subcategory_id propagate
- `src/lib/app-routes.tsx` + `src/components/admin/AdminSidebar.tsx` — `/admin/brands` route + nav link

কোন migration বা types regenerate user-approval দরকার — implementation-এ proceed করব।