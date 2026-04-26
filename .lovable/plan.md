## সমস্যা

মার্কেটপ্লেসে দোকানের কার্ডে থাকা **"ফর্দ পাঠান"** বোতামে ক্লিক করলে error আসছে:
> Edge function returned 404 — "এই লিঙ্কটি আর সক্রিয় নেই"

### কারণ

Database-এ "ফর্দ" link-এর জন্য আলাদা একটা column আছে — `shops.wishlist_slug` (যেমন: `epy2h9al`)। কিন্তু `src/routes/shop.index.tsx`-এ button-এর URL বানানো হচ্ছে `s.username` (যেমন: `file-server`) দিয়ে। ফলে `/f/file-server` URL-টা edge function-এ গিয়ে কোনো matching shop পায় না → 404।

মার্কেটপ্লেস API-ও বর্তমানে response-এ `wishlist_slug` field পাঠাচ্ছে না, তাই frontend-এর কাছে ওই value নেই।

## Fix

### ১. `supabase/functions/marketplace-public/index.ts`
`list-shops` action-এর shops query-তে `wishlist_slug` field select করতে হবে যাতে frontend-এ আসে।

### ২. `src/routes/shop.index.tsx`
- `Shop` type-এ `wishlist_slug: string | null` field যোগ
- Line 450-এর fallback chain বদলে:
  ```tsx
  const fordoSlug = s.wishlist_slug ?? null;
  ```
- যেসব দোকানের `wishlist_slug` নেই, ওদের জন্য আগের মতই "ফর্দ লিঙ্ক নেই" দেখাবে।

### ৩. Verification
Fix-এর পর "File Server" দোকানের ফর্দ link হবে `/f/epy2h9al`, যা edge function ঠিকভাবে resolve করবে।

## প্রভাব

- শুধুমাত্র marketplace shop list page-এর "ফর্দ পাঠান" button ঠিক হবে
- অন্য কোনো feature/page প্রভাবিত হবে না
- যেসব দোকানে এখনো `wishlist_slug` set করা নেই, তাদের জন্য graceful "ফর্দ লিঙ্ক নেই" দেখাবে (নতুন কোনো error আসবে না)
