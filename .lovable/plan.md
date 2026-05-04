# মার্কেটপ্লেসে সার্ভিস দেখানোর ব্যবস্থা

বর্তমান অবস্থা: `marketplace_service_listings` table আছে এবং Services page থেকে সার্ভিস অনলাইন publish করা যাচ্ছে। কিন্তু public marketplace (`/shop`) এ শুধু "দোকান" আর "পণ্য" tab আছে — সার্ভিসের কোন tab/listing/filter নেই, আর `marketplace-public` edge function এ services আনার কোনো action নেই।

## কী করব

### 1. Edge Function: `supabase/functions/marketplace-public/index.ts`
নতুন তিনটি action যোগ করব:
- **`list-services`** — published services list, with filters: `q` (নাম search), `min_price`/`max_price`, `category` (service_categories), `division`/`district`/`upazila` (service_areas array contains), `home_service` (true/false), `sort` (newest/price_asc/price_desc), pagination। response এ services + shops map ফিরবে।
- **`service-detail`** — single service id দিয়ে detail (service + shop info)।
- **`service-categories`** — distinct service category list (filter dropdown এর জন্য)।

সব response এ shop must be `marketplace_enabled=true` এবং listing `is_published=true`।

### 2. Public Marketplace UI: `src/pages/shop/Index.tsx`
Tabs এ তৃতীয় option যোগ করব: **দোকান | পণ্য | সার্ভিস**।
- `view=services` হলে নতুন services grid render হবে।
- Services-specific filter panel: মূল্যসীমা, ক্যাটাগরি (dropdown), এলাকা (Division → District → Upazila cascading picker — Services.tsx এ যেটা আছে সেটাই reuse), "বাসায় এসে সার্ভিস" toggle, sort।
- নতুন `ServiceCard` component তৈরি করব (image, নাম, দাম, duration, area chips, "বিস্তারিত" button)।

### 3. Service Detail Page (নতুন route)
`src/pages/shop/service/[id].tsx` — service-এর full info, shop card, "ফোন করুন" / "মেসেজ" / "বুক করুন" CTA। বুক করলে shop owner-এর কাছে inquiry হিসেবে যাবে (existing messages বা contact flow ব্যবহার করব)।

### 4. Shop Page (`/s/{slug}`) এ Services section
`src/pages/shop/s/Slug.tsx` এ "পণ্যসমূহ" এর পাশে "সার্ভিসসমূহ" tab/section যোগ করব যাতে কোনো দোকানের সার্ভিসগুলো একসাথে দেখা যায়।

## টেকনিক্যাল ডিটেইল

- Service area filter: `service_areas` text[] column-এ values "Division › District › Upazila" format এ আছে (Services.tsx থেকে)। edge function এ `array contains`/`overlaps` ব্যবহার করব।
- Edge function এ shop join করব same pattern এ যেমন products এ আছে।
- কোনো DB migration লাগবে না — সব table/column ইতিমধ্যে আছে।

প্রশ্ন: সার্ভিস "বুক" করলে কোথায় যাবে — (a) shop owner কে message/inquiry, (b) cart-style booking with date/time, নাকি (c) শুধু "ফোন করুন" CTA এই version এ? ডিফল্ট ধরে নিচ্ছি **(c) ফোন/WhatsApp CTA + একটি simple inquiry form** যা shop messages-এ যাবে।
