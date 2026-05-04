## লক্ষ্য

মার্কেটপ্লেসের দোকান কার্ডে এবং প্রতিটা দোকানের অনলাইন স্টোর পেজে — পণ্য আর সার্ভিস দুটোই আলাদাভাবে দেখাতে হবে।

## পরিবর্তনসমূহ

### 1. Edge function — `supabase/functions/marketplace-public/index.ts`
- **`list-shops` action**: এখন শুধু `counts` (products) দেয়। নতুন করে `service_counts` ম্যাপ যোগ — `marketplace_service_listings` থেকে published service গুনে প্রতি shop_id-র বিপরীতে।
- **`shop` ও `shop-by-username` action**: response-এ `services: []` যোগ — `marketplace_service_listings` + `services` join করে ঐ shop-এর published, active সার্ভিসগুলো ফেরত।

### 2. Marketplace দোকান কার্ড — `src/pages/shop/Index.tsx` (vendors view)
বর্তমান একটা badge ("X টি পণ্য") এর জায়গায় দুটো badge:
- `ShoppingBag` আইকন + `X টি পণ্য`
- `Wrench` আইকন + `Y টি সার্ভিস`

`vendorsQ.data` থেকে দুই counts ব্যবহার করব।

### 3. দোকানের পাবলিক স্টোর পেজ — products + services টাব
দুটো ফাইলে একই pattern:
- `src/pages/shop/s/Slug.tsx`
- `src/pages/vendor/Username.tsx`

বর্তমান "পণ্যসমূহ" সেকশনের জায়গায় shadcn `Tabs` দিয়ে দুটো ট্যাব:
- **পণ্য (N)** — বর্তমান `MarketplaceProductCard` গ্রিড
- **সার্ভিস (M)** — `MarketplaceServiceCard` গ্রিড (already exists)

যদি কোনো ট্যাবে item না থাকে — empty state ("এই দোকানে এখনো কোনো ... যোগ হয়নি")। যদি দুটোর কোনোটাই না থাকে, একই empty state রাখা যাবে। যদি একটাই থাকে, ট্যাব strip তবুও দেখাবে যাতে user clarity পায়।

### 4. টাইপ
ছোট `Service` type যোগ যেটা `MarketplaceServiceCard`-এ ইতিমধ্যে যা পাঠানো হয় তার সাথে মিল রেখে।

## স্কোপের বাইরে
- নতুন DB column বা migration লাগবে না — `marketplace_service_listings` + services টেবিল ইতিমধ্যে আছে।
- বুকিং / অর্ডার flow এ পরিবর্তন নেই।
