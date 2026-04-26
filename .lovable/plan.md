## লক্ষ্য

গ্রাহক যখন দোকানের ফর্দ লিঙ্কে গিয়ে ফর্দ পাঠাবে, তখন **মোবাইল নাম্বার + ৪-৬ digit PIN** বাধ্যতামূলক হবে। পরে গ্রাহক একই দোকানের লিঙ্কে এসে নিজের সব পুরাতন ফর্দ, নোট, এবং saved templates একটা ছোট্ট dashboard-এ দেখতে পারবে।

## ভালো খবর — Backend আগেই তৈরি আছে

প্রজেক্টে ইতোমধ্যে আছে:
- `wishlist_customers` table (phone + pin_hash সহ)
- `customer-wishlist-login` edge function (phone + PIN → 30-দিনের token)
- `customer-wishlist-history` edge function (token → সব ফর্দ + items + templates)
- `submit-wishlist` edge function (ইতিমধ্যে PIN handle করে — কিন্তু optional)

তাই শুধু **frontend-এ PIN বাধ্যতামূলক করা** এবং **"আমার ফর্দ" page যোগ করা** বাকি।

## কী পরিবর্তন হবে

### 1. গ্রাহকের ফর্দ submit form-এ পরিবর্তন (`src/routes/f.$slug.tsx`)

- "ফর্দ পাঠান" বাটনের পাশে দুইটা ইনপুট বাধ্যতামূলক করা:
  - **মোবাইল নাম্বার** (ইতিমধ্যে আছে)
  - **PIN (৪-৬ digit)** — নতুন গ্রাহক হলে নিজে তৈরি করবে; আগে থেকে থাকলে সেই PIN দিতে হবে
- যদি এই নাম্বারে আগে থেকে account থাকে → "আপনার PIN দিন"
- নতুন হলে → "একটি ৪-৬ digit PIN তৈরি করুন (পরে এই PIN দিয়ে নিজের ফর্দ দেখতে পারবেন)"
- Submit সফল হলে একটা confirmation card-এ লেখা থাকবে: "✅ ফর্দ পাঠানো হয়েছে। আপনার PIN: ••••। পরে [আমার ফর্দ দেখুন] বাটনে ক্লিক করে এই দোকানের সব ফর্দ দেখতে পারবেন।"
- উপরে একটা ছোট link/button: **"আমার ফর্দ দেখুন →"** যা `/f/$slug/my` এ নিয়ে যাবে

### 2. নতুন গ্রাহক dashboard route — `src/routes/f.$slug.my.tsx`

দুইটা view থাকবে এই page-এ:

**A. লগইন স্ক্রিন (token না থাকলে):**
- দোকানের নাম + logo উপরে
- মোবাইল নাম্বার + PIN ইনপুট
- "দেখুন" বাটন → `customer-wishlist-login` কল করে token পাবে → `localStorage`-এ save (key: `wl_token_<slug>`)

**B. Dashboard (token থাকলে):**
- উপরে: "স্বাগতম, [গ্রাহকের নাম]" + লগআউট
- **আমার ফর্দসমূহ** — সব past wishlists list, প্রতিটিতে status badge (নতুন/দেখা হয়েছে/সম্পন্ন), তারিখ, item count
  - কোনো একটায় ক্লিক করলে accordion expand হয়ে items দেখাবে (নাম, qty, unit, দাম, fulfillment status, দোকানদারের নোট)
- **আমার নোটস/templates** — saved templates (যদি থাকে) — "এই template দিয়ে নতুন ফর্দ পাঠান" বাটন → `/f/$slug?tpl=<id>`
- নিচে একটা CTA: **"নতুন ফর্দ পাঠান"** → `/f/$slug`

### 3. ছোট UI link

- `f.$slug.tsx` page-এর উপরে header-এ ইতিমধ্যে `History` icon আছে — সেটাকে এই নতুন `/f/$slug/my` route-এ পয়েন্ট করানো হবে।

## Validation Rules

- PIN: শুধু ৪–৬ digit number (regex `^\d{4,6}$`)
- মোবাইল: ইতিমধ্যে `^[0-9+]{6,20}$`
- উভয়ই খালি থাকলে submit button disabled

## Database পরিবর্তন

কিছু না — schema আগেই ঠিক আছে।

## কী নতুন তৈরি হবে

- `src/routes/f.$slug.my.tsx` — গ্রাহকের dashboard

## কী edit হবে

- `src/routes/f.$slug.tsx` — PIN বাধ্যতামূলক, helper text, "আমার ফর্দ" link, success card update

কাজ শুরু করব কি?