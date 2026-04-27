# গ্রাহকের প্রিয় দোকান + খোঁজার ফিল্ড একীভূত করা

দুটি ছোট কিন্তু কাজের উন্নতি গ্রাহক পোর্টালে।

## ১) প্রিয় দোকান (Save করা দোকান) ⭐

গ্রাহক একটা দোকানকে "★ প্রিয়" হিসেবে সংরক্ষণ করতে পারবেন। পরের বার ফর্দ পাঠানোর সময় ওই দোকান সবার উপরে এক ক্লিকে দেখা যাবে — কারণ একজন গ্রাহক সাধারণত নিয়মিত একটা দোকান থেকেই কেনাকাটা করেন।

**Database:** `consumer_favourite_shops` table আগেই তৈরি আছে (consumer_id, shop_id, created_at) — শুধু RLS policy ও কোডে ব্যবহার শুরু করতে হবে।

**নতুন ফর্দ পেজে (`/customer/create-fordo`, Step 2):**
- সবার উপরে নতুন section: **"⭐ আপনার প্রিয় দোকান"**
- প্রতিটি প্রিয় দোকানের পাশে star ভরা — click করে সরিয়েও ফেলা যাবে
- কোনো প্রিয় দোকান না থাকলে section হাইড থাকবে
- এলাকার দোকান/সার্চ ফলাফলে প্রতিটি ShopRow-এর পাশে ফাঁপা ★ icon — click করলে প্রিয় তালিকায় যোগ হবে (টোস্ট: "✓ প্রিয় তালিকায় যোগ হয়েছে")
- প্রিয় দোকান হলে ★ ভরা দেখাবে

**আমার ফর্দ পেজে (`/customer/my-fordo`):**
- "সময়সূচী" section-এর উপরে ছোট একটা **"⭐ প্রিয় দোকান"** strip — chip আকারে দোকানের নাম, click করলে সরাসরি `/customer/create-fordo?shopId=xxx` (Step 2-এ ওই দোকান উপরে highlight)

## ২) দোকান খোঁজার দুটি কার্ড একসাথে করা

বর্তমানে Step 2-এ দুটি আলাদা কার্ড: একটি মোবাইল নম্বরে, আরেকটি দোকানের নামে — অযথা জায়গা নষ্ট।

**নতুন একক কার্ড — "দোকান খুঁজুন":**
- একটাই input box
- Auto-detect: ইনপুটে সংখ্যা থাকলে phone search, না হলে name search
- Placeholder: `"মোবাইল নম্বর বা দোকানের নাম..."`
- পাশে একটাই 🔍 button (Enter দিয়েও submit হবে)

## প্রযুক্তিগত পরিবর্তন (টেকনিক্যাল)

**Migration (RLS policies for `consumer_favourite_shops`):**
- Policies already exist ("fav read/insert/delete own") — শুধু verify করা হবে, নতুন migration লাগবে না।

**ফাইল পরিবর্তন:**
- `src/pages/customer/CreateFordo.tsx`:
  - নতুন `favourites` state + load `consumer_favourite_shops` (shop details সহ join)
  - Step 2-এ নতুন "প্রিয় দোকান" section সবার উপরে
  - দুই search কার্ড → এক কার্ডে merge, smart `onSubmit` (digit-detection)
  - `ShopRow` component-এ star toggle button যোগ
  - `?shopId=xxx` param সাপোর্ট — auto Step 2-তে যাবে ও ওই দোকান highlight হবে
- `src/pages/customer/MyFordo.tsx`:
  - উপরে favourite shops chip strip (click করলে create-fordo-এ যাবে shopId সহ)
- কোনো নতুন route, edge function, বা schema change লাগবে না।
