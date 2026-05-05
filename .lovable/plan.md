তিনটা আলাদা সমস্যা — তিনটাই fix করব।

## 1) "মার্কেটপ্লেস ক্যাটাগরি / সাবক্যাটাগরি" field — Seller product dialog থেকে সরাবো

**বর্তমান অবস্থা:** `src/pages/app/Products.tsx` (line 1443–1483)-এ shop owner-এর product add/edit dialog-এ দুইটা dropdown দেখানো হচ্ছে — Marketplace Category এবং Subcategory। এগুলো `products.marketplace_category_id` field-এ save হয়।

**সমস্যা:** এটা platform-level taxonomy — admin manage করে। Shop owner-কে এটা দেখানোর কোনো কারণ নাই; সে যখন catalog থেকে product pick করে তখন category এমনিতেই inherit হয়। User confused — "এটা admin portal না product add?"

**সমাধান:**
- Seller-এর product dialog থেকে দুইটা Select সরিয়ে দেব।
- Catalog-linked product হলে তার marketplace_category_id automatic backfill হবে catalog row থেকে (`marketplace_products` join)।
- Manual product হলে field empty থাকবে — admin দরকার হলে assign করবে।
- Save handler থেকে `mpCategoryId` / `mpSubcategoryId` state ও payload field বাদ যাবে।

## 2) Variant editor-এ column header যোগ করব (admin Marketplace dialog)

**বর্তমান অবস্থা:** `src/components/admin/MarketplaceVariantEditor.tsx` (line 260–278)-এ "Variants (7)" এর নিচে প্রতি row-তে চারটা input থাকে কোনো header ছাড়া — শুধু placeholder text (Price / Cost / Pack / Barc)। Screenshot-এ দেখা যাচ্ছে label না থাকায় কনফিউশন।

**সমাধান:**
- "Variants (N)" heading-এর নিচে একটা sticky header row বসাবো একই 12-col grid-এ:
  - col-span-4: "Variant"
  - col-span-2: "Sale Price (৳)"
  - col-span-2: "Cost Price (৳)"
  - col-span-2: "Pack Size"
  - col-span-1: "Barcode"
  - col-span-1: (action)
- Header bn/en bilingual: "Variant / ভ্যারিয়েন্ট", "বিক্রয় মূল্য", "ক্রয় মূল্য", "প্যাক", "বারকোড"।
- Header `bg-muted text-xs font-semibold` — scrollable list-এর top-এ stick করবে।

## 3) Sell-এ variant-aware picker

**বর্তমান অবস্থা:** Variant-যুক্ত catalog product যখন seller add করে, প্রত্যেক variant আলাদা product row হিসাবে save হয় (`parent_product_id` দিয়ে link)। Sell page (`src/pages/app/Sell.tsx`)-এ এগুলো আলাদা আলাদা product হিসাবে দেখায় — list-এ "Diaper — XL", "Diaper — L" আলাদা item। User বলছেন বিক্রির সময় variant pick করার একটা proper UX দরকার।

**সমাধান:**
- Sell-এর product picker-এ যেসব row-এর `parent_product_id` আছে সেগুলো parent name-এর নিচে group করব (visually nested badge)। List item-এ variant_label badge দেখাবে (e.g. "XL", "500g", রঙের swatch)।
- Parent product (যেটা stock=0 placeholder) hide করব list থেকে — সে শুধু grouping shell।
- Search "Diaper" type করলে সব children show করবে; variant_label-ও searchable।
- কোনো extra dialog লাগবে না — flat list-এ variant badge সবচেয়ে fast (mobile-friendly)।

## Files

- `src/pages/app/Products.tsx` — marketplace category dropdown ও related state/payload remove
- `src/components/admin/MarketplaceVariantEditor.tsx` — column header row যোগ
- `src/pages/app/Sell.tsx` — product list query-তে parent placeholder filter, variant_label badge rendering, search match update

কোনো DB migration লাগবে না।
