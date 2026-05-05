## লক্ষ্য

একই product-এর একাধিক variant (যেমন diaper-এর S/M/L/XL size, বা শার্টের color) এক product entry-এর ভেতরে রাখা — যাতে shop owner-এর product list ছোট থাকে এবং mobile থেকে দ্রুত কাজ করা যায়। Admin marketplace catalog-এ ready variant template বানিয়ে রাখবে, shop owner শুধু **variant-wise quantity + price** বসাবে।

## ৩টি স্তর

```text
[Admin]              [Marketplace Catalog]              [Shop Owner App]
preset variants  →   marketplace_products              pick from catalog
                     + variants (size/color/...)        → auto-fill all variants
                                                        → just enter qty + price
```

## Database changes

নতুন ২টা table + ৩টা column:

**1. `variant_attribute_presets`** (admin-managed library)
- `id`, `name_en` (e.g., "Diaper Size"), `name_bn`
- `attribute_type` text: `size | color | weight | volume | flavor | model | custom`
- `values jsonb` — preset list, e.g. `[{code:"S",label_en:"Small",label_bn:"ছোট"},{code:"M",...}]`
- `is_default boolean` — system seeded common presets
- Default seed data: Diaper Size (NB/S/M/L/XL/XXL), Clothing Size (XS–XXL), Shoe Size (36–45), T-shirt Color (Red/Blue/Black/White...), Volume (250ml/500ml/1L/2L), Weight (250g/500g/1kg/2kg/5kg), Flavor (Strawberry/Vanilla/Chocolate)।

**2. `marketplace_product_variants`** (catalog variant template)
- `id`, `marketplace_product_id` FK
- `variant_label_en`, `variant_label_bn` (e.g. "Size: M", "Color: Red / Size: M")
- `attributes jsonb` — `{size:"M", color:"Red"}`
- `image_url` (variant-specific, optional)
- `barcode`, `pack_size`, `default_price`, `sort_order`
- `is_active`

**3. `products` table-এ ৩টা নতুন column:**
- `parent_product_id uuid` — যদি এটা একটা variant হয়, parent product reference
- `variant_label text` — display label
- `variant_attributes jsonb` — `{size:"M", color:"Red"}`

(একটা parent product list-এ ১টা card হিসেবে দেখাবে, expand করলে ভেতরে variant rows।)

## Admin Portal: "Variant Presets" page

`/admin/variant-presets`
- Preset library CRUD — admin নতুন attribute type + value list বানাবে
- Marketplace product edit dialog-এ নতুন **"Variants" tab**:
  - "Add Variant Group" → preset থেকে select (e.g., Diaper Size)
  - একাধিক group combine করা যাবে → auto-cartesian (Color × Size = সব combinations)
  - প্রতি variant row-এ price/barcode/image/sort override
  - Save করলে `marketplace_product_variants`-এ সব row insert

## Shop Owner App: simplified flow

`src/pages/app/Products.tsx`-এ পরিবর্তন:

**A. Catalog থেকে যোগ করার সময়:**
- Catalog product-এর variants থাকলে dialog-এ একটা variant grid দেখাবে (checkbox + qty input করে)
- "Add all variants" / "Select few" toggle
- প্রতি selected variant → একটা `products` row তৈরি — `parent_product_id` set, `name = parent name + variant_label`, price prefilled, owner শুধু **stock qty** বসাবে
- Cost price prefill = marketplace default এর % (configurable), অথবা blank রেখে owner-কে quick-fill করতে দেবে

**B. Product list view:**
- Parent product একটা card হিসেবে — "Diaper XYZ — 4 variants" badge
- Expand → ভেতরে variant rows (size, qty, price)
- Mobile-এ inline qty +/− buttons প্রতি variant-এর পাশে
- Edit button → variant-grid bottom sheet, একসাথে সব variant-এর qty/price update

**C. নতুন bulk-fill bottom sheet (`VariantBulkFillSheet`):**
- শুধু qty এর column — সব variant একসাথে stock add
- "Apply same price to all" toggle
- Mobile-first, large touch targets

## Sales-এ প্রভাব

`sale_items.product_id` যেহেতু individual variant row-কে point করবে (parent না), সেলিং flow অপরিবর্তন থাকবে। POS search-এ variant label দেখাবে (e.g., "Pampers Premium — Size L")।

## Files (নতুন/edit)

নতুন:
- `supabase/migrations/<ts>_variant_system.sql` — schema + seed presets
- `src/pages/admin/VariantPresets.tsx`
- `src/components/admin/MarketplaceVariantEditor.tsx` (catalog editor-এ embed)
- `src/components/app/VariantPickerSheet.tsx` (shop owner — catalog থেকে variant select)
- `src/components/app/VariantBulkFillSheet.tsx` (bulk qty/price entry)
- `src/components/app/ProductVariantGroup.tsx` (list-এ expandable card)

Edit:
- `src/pages/app/Products.tsx` — group view, variant integration
- `src/pages/admin/MarketplaceProducts.tsx` (or equivalent catalog editor) — Variants tab
- `src/components/admin/AdminSidebar.tsx` — Variant Presets link
- `src/lib/admin-perms.ts`, `src/lib/app-routes.tsx`
- `src/components/app/CatalogProductPicker.tsx` — show variant count, route to picker sheet

## RLS

- `variant_attribute_presets`: admin write, all read
- `marketplace_product_variants`: admin write, all read (catalog public)
- `products` columns: existing shop-scoped RLS (no changes needed)

## ক্রম

1. Migration + seed default presets (Diaper, Clothing, Shoe, Color, Volume, Weight, Flavor)
2. Admin Variant Presets page
3. Marketplace catalog editor-এ Variants tab
4. Shop owner Products page — variant picker + grouped list + bulk-fill sheet
5. POS/Sales product search-এ variant label show

প্রথম turn-এ ১–৪ সব deliver করব। POS search label tweak ৫ নম্বরে আলাদা।
