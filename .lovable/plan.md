# Chaldal Product Import → Marketplace Catalog

আপনি scraping function চান না — তাই আমি এক-বার ব্যাক-এন্ড স্ক্রিপ্ট চালিয়ে Chaldal-এর পুরো catalog আপনার `marketplace_categories` + `marketplace_products` টেবিলে ঢেলে দেব। Admin UI-তে শুধু একটা ছোট "Marketplace Catalog" view থাকবে যেখান থেকে আপনি import-এর ফলাফল দেখতে / edit / delete / re-run করতে পারবেন।

## পরিকল্পনা

### ১. Data source
Chaldal একটা public JSON API expose করে (`/api/v1/...` — প্রতিটা category page-এ AJAX দিয়ে JSON দেয়), category tree সহ। আমি সেটাই ব্যবহার করব — HTML scrape না, তাই দ্রুত ও নির্ভরযোগ্য।

পাওয়া যাবে: name (EN+BN), image, category, sub-category, pack size, price, brand, description.

### ২. One-time import script (`scripts/import-chaldal.ts`)
- Bun দিয়ে চলবে: `bun run scripts/import-chaldal.ts`
- Service-role Supabase client ব্যবহার করবে (RLS bypass)
- ধাপ:
  1. Chaldal-এর সব top-level + sub-category fetch → `marketplace_categories` upsert (parent/child tree, slug, name_bn/name_en)
  2. প্রতিটা sub-category-র সব product page করে JSON fetch → `marketplace_products` upsert (slug দিয়ে dedupe)
  3. প্রতিটা product-এ `category_id` + `subcategory_id` link, image_url, brand, pack_size, default_price ভরবে
  4. Progress log (কত category, কত product done)
- Re-run safe: সব upsert (slug unique key)

### ৩. Admin Portal page: `/admin/marketplace-products`
নতুন একটা page যাতে আপনি ফলাফল manage করতে পারেন:
- Search + filter (category, brand)
- List view (image, name, category, price, active toggle)
- Edit dialog (name, price, image, category, active)
- Bulk delete / activate / deactivate
- "Re-run Chaldal import" button → একটা server function trigger করবে যা script-এর import logic চালাবে (background, progress toast)
- AdminSidebar-এ "Marketplace Products" link (`Package` icon, `marketplace` permission)

### ৪. Server function: `runChaldalImport`
- `src/server/marketplace-import.functions.ts`
- admin-only (role check)
- Same logic as script, called from Admin UI button
- Returns summary: `{ categoriesAdded, productsAdded, productsUpdated, errors }`

### ৫. Files

```text
NEW  scripts/import-chaldal.ts                          # CLI script
NEW  src/server/marketplace-import.server.ts            # core fetch + upsert logic
NEW  src/server/marketplace-import.functions.ts         # createServerFn wrapper (admin-only)
NEW  src/pages/admin/MarketplaceProducts.tsx            # CRUD + import UI
EDIT src/lib/admin-perms.ts                             # already has "marketplace"
EDIT src/components/admin/AdminSidebar.tsx              # add link
EDIT src/lib/app-routes.tsx                             # add route
```

### ৬. কোনো DB schema change লাগবে না
`marketplace_products` + `marketplace_categories` টেবিল আগেই আছে এবং সব দরকারি column (brand, image_url, pack_size, category_id, subcategory_id) ready।

## সতর্কতা

- Chaldal-এর rate-limit এড়াতে script-এ ছোট delay (200ms/request) থাকবে।
- Image URL Chaldal-এর CDN-এর reference হিসেবে রাখব (re-host করব না — storage খরচ এড়াতে)। চাইলে পরে S3-এ copy করার option add করা যাবে।
- আনুমানিক ~১৫,০০০ product → প্রথম import ~৩০-৪৫ মিনিট লাগতে পারে। Server function timeout এড়াতে UI button category-by-category batch trigger করবে; CLI script এক-শটে চালাতে পারবেন।
- Legal: Chaldal-এর data আপনি নিজের platform-এ পুনঃপ্রকাশ করছেন — দায়িত্ব আপনার।

Approve করলে আমি ১, ২, ৩, ৪ build করে ফেলব এবং প্রথম import test-run করে দেখাব।
