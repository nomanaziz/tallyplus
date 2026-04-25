## দুটি ফিচার একসাথে

### Feature 1 — Sample Product Import (shop owner-এর জন্য)

Admin যে `marketplace_products` table-এ ৫০০+ sample product রেখেছে, shop owner সেগুলা থেকে এক ক্লিকে নিজের shop-এ import করতে পারবে।

**যেখানে যাবে:** `/app/products` পেজের header-এ "Add Product" বাটনের পাশে নতুন **"স্যাম্পল ইম্পোর্ট / Import Sample"** বাটন।

**Flow:**

1. বাটনে click → fullscreen Sheet/Dialog খুলবে।
2. বাঁদিকে **category list** (marketplace_products এর distinct `category` থেকে, count সহ): "পার্সোনাল কেয়ার (32)", "স্টেশনারি (30)" ইত্যাদি। প্রত্যেকটার পাশে checkbox।
3. ডানদিকে selected category-র product-list, প্রত্যেকটার আগে checkbox + thumbnail, name, brand, pack_size, default_price।
4. উপরে search bar — পুরো catalog-এ name/brand দিয়ে filter।
5. **"সম্পূর্ণ ক্যাটাগরি যোগ"** বাটন → ওই category-র সব product auto-select।
6. নিচে footer-এ **Import (N)** বাটন। Click করলে:
   - প্রত্যেকটা selected catalog product → `products` table-এ insert হবে (current `shop_id` সহ)।
   - Catalog-এর `category` text → `categories` table-এ ensure করা হবে (একই নামে থাকলে reuse, না থাকলে নতুন create)।
   - barcode duplicate হলে skip করা হবে এবং toast-এ জানাবে।
7. Success → toast ("N টি product import হয়েছে") + Sheet close + product list refresh।

এই import logic পুরোটাই client-side (Supabase JS দিয়ে — insert categories first, map names, then insert products)। কোনো edge function বা migration লাগবে না।

### Feature 2 — Online Marketplace in-app

`/app/online-shop` এখন placeholder। এটাকে আসল **in-app marketplace browse page** বানাবো, যেখানে যেকোনো shop owner-এর published `marketplace_listings` দেখাবে।

**Page structure:**

- PageHeader: "অনলাইন মার্কেটপ্লেস / Online Marketplace"
- Top: সার্চ বার + category filter
- Grid (২–৪ columns responsive): প্রত্যেক listing card-এ:
  - Product image (না থাকলে placeholder icon)
  - Product name
  - **দাম** (`price`) — bold, primary color
  - **Stock** — শুধু `stock > 0` হলে দেখাবে: "স্টক: ১২ pcs"; ০ বা negative হলে কিছু দেখাবে না (বা "স্টক আউট" ছোট badge)
  - **Warranty** — শুধু থাকলে: "ওয়ারেন্টি: ৬ মাস"
  - Shop name + logo (নিচে ছোট করে)
- Pagination (24/page)
- Card click → existing `/shop/p/$id` detail page-এ যাবে (কিংবা new tab)

**Data source:** existing `marketplace-public` edge function (`action: "list"`) — public, no auth needed, কাজ করে।

**Warranty support:** `marketplace_listings`-এ `warranty_months integer null` column যোগ করব (migration)। Edge function-এর select-এ যোগ করব। Display conditional।

**Owner-side publish flow:** এই plan-এ নতুন publish UI বানাচ্ছি না (যেহেতু user শুধু marketplace দেখতে চেয়েছে)। Publish flow পরে আলাদা ফিচার হিসেবে আসবে — currently admin/marketplace page-এ owner directly listing add করতে পারে।

### Files to create

- `src/components/app/SampleProductImportSheet.tsx` — category + product picker dialog
- `src/routes/app.online-shop.tsx` — replace placeholder with real grid

### Files to modify

- `src/routes/app.products.tsx` — header-এ Import Sample button + Sheet integration
- `supabase/functions/marketplace-public/index.ts` — listing select-এ `warranty_months` যোগ

### Migration

```sql
alter table public.marketplace_listings
  add column if not exists warranty_months integer;
```

### Notes

- Sample import ⇒ একই shop owner একই product বার বার import করলে barcode unique check (যদি barcode থাকে) দিয়ে skip করব। Name দিয়ে dedup করব না (একই নাম legit দু'বার থাকতে পারে)।
- Online marketplace tab পেলে user "অনলাইন শপ" sidebar item থেকে browse করতে পারবে।
- Design tokens (primary, success, muted) ব্যবহার — কোনো hardcoded color না।
