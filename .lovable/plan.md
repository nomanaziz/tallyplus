## কী ঠিক করা হবে

আমি দুইটা আলাদা সমস্যা একসাথে ঠিক করব:

1. **প্রোডাক্ট রিটার্ন কাজ না করা**
2. **আমার ফর্দ-এ পাঠানো ফর্দ না দেখা**, বিশেষ করে `+8801841577944`-এর মতো কেস যেখানে ফর্দ দোকানদারের কাছে আছে কিন্তু গ্রাহকের তালিকায় নেই

## কেন সমস্যা হচ্ছে

### 1) Product Return
`/app/returns/new` আর `/app/returns/:id` রুটগুলো `returns` রুটের নিচে nested আছে, কিন্তু parent page (`Returns.tsx`) child route render করার জন্য outlet দেয় না। ফলে “নতুন রিটার্ন” বা details page ঠিকমতো খুলে না। এটাই return feature “not working” লাগার প্রধান কারণ।

### 2) আমার ফর্দ
এখন `MyFordo.tsx` সরাসরি `customer_wishlists` আর `customer_wishlist_items` টেবিল query করছে। কিন্তু public wishlist link (`/f/:slug`) দিয়ে পাঠানো ফর্দগুলো `wishlist_customer_id`-এর মাধ্যমে সংরক্ষিত হয়, আর logged-in app flow (`customer-create-wishlist`) `consumer_user_id` দিয়ে সংরক্ষণ করে। ফলে data দুইভাবে জমা হচ্ছে, কিন্তু `MyFordo` সবগুলোকে নির্ভরযোগ্যভাবে একসাথে তুলতে পারছে না।

এছাড়া customer-side direct table query-র ওপর ভরসা করলে RLS-এর কারণে কিছু ফর্দ emptyও আসতে পারে। তাই একই জিনিস বারবার চেষ্টা করতে হচ্ছে।

## implementation plan

### Step 1 — Product Return route fix
- `src/routes.tsx`-এ returns routes flatten করব:
  - `/app/returns`
  - `/app/returns/new`
  - `/app/returns/:id`
- দরকার হলে return pages-এ permission wrapper consistent করব, যাতে route fix-এর পরে access behaviorও ঠিক থাকে।

### Step 2 — My Fordo-র জন্য secure unified data source
- নতুন server-side endpoint/function বানাব যা logged-in consumer authenticate করে
- সেখানে দুই source একসাথে load করব:
  - `consumer_user_id = current user`
  - `wishlist_customer_id` linked records, phone-normalized matching সহ
- response-এ wishlist, item, shop info একসাথে ফেরত দেব
- duplicate wishlist dedupe করে newest-first সাজাব
- `src/pages/customer/MyFordo.tsx`-কে direct table query থেকে এই unified source-এ switch করব

### Step 3 — Future data mismatch বন্ধ করা
- `supabase/functions/customer-create-wishlist/index.ts` আপডেট করব যাতে logged-in flow-তেও সম্ভব হলে `wishlist_customer_id` set হয়
- এতে app flow আর public link flow একই customer identity-তে bind হবে
- ভবিষ্যতে একই customer-এর ফর্দ আর আলাদা portal/data shape-এ split হয়ে যাবে না

## expected result

- “নতুন রিটার্ন” button চাপলে page ঠিকমতো খুলবে
- return details page কাজ করবে
- দোকানে পাঠানো কিন্তু customer list-এ না দেখা ফর্দগুলো “আমার ফর্দ” এ দেখা যাবে
- একই issue-তে বারবার retry করে credit নষ্ট হবে না
- পুরনো public-link wishlist আর logged-in wishlist একই জায়গা থেকে দেখা যাবে

## technical details

- Files to update:
  - `src/routes.tsx`
  - `src/pages/customer/MyFordo.tsx`
  - `supabase/functions/customer-create-wishlist/index.ts`
  - new server-side function/endpoint for unified customer fordo history
- I will avoid broad public RLS loosening; the missing-foro fix will be done through **authenticated server-side resolution**, which is safer for customer data.
- If needed, I will also add a small normalization layer for phone matching so `018...`, `880...`, and `+880...` formats map correctly.

Approve করলে আমি এগুলো implement করব।