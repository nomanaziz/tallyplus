## লক্ষ্য

গ্রাহক যেন তার ফর্দ মোবাইল নাম্বার দিয়ে save করতে পারে, পরে আবার retrieve করে দেখতে পারে দোকানদার কী কী দিয়েছে / দেয়নি, এবং প্রত্যেক মাসে সেই ফর্দটাই reuse করে আবার পাঠাতে পারে।

## কীভাবে কাজ করবে (গ্রাহকের দৃষ্টিকোণ থেকে)

1. গ্রাহক `/f/{slug}` page-এ ফর্দ পাঠালে, তার phone নাম্বার দিয়ে একটা **স্থায়ী customer profile** তৈরি হবে (per shop)। সাথে ৬-ডিজিটের একটা **PIN** auto-generate হবে (browser localStorage-এও save হবে যেন একই ফোনে আবার দেখতে গেলে কিছু লিখতে না হয়)।
2. Submit হওয়ার পর confirmation screen-এ একটা personal link দেখানো হবে: `/f/{slug}/my` — গ্রাহক bookmark করতে পারবে, WhatsApp-এ নিজেকে পাঠাতে পারবে।
3. `/f/{slug}/my` page-এ phone + PIN দিয়ে login করলে গ্রাহক দেখবে:
   - **আমার সব ফর্দ** (history): প্রতিটার date, item count, total, status (নতুন / প্রস্তুত / সরবরাহকৃত)
   - প্রতিটা ফর্দে item-wise: ✅ পেয়েছি / ❌ পাইনি / ⏳ পরে দিবে — দোকানদার যা mark করেছে
   - **"আবার পাঠান"** button → আগের ফর্দের সব item pre-fill হয়ে নতুন submit form খুলবে, গ্রাহক qty edit করে আবার পাঠাবে
4. **নিজস্ব saved templates**: গ্রাহক চাইলে কোনো ফর্দকে "মাসিক বাজার" নাম দিয়ে template হিসেবে save করতে পারবে।

## কীভাবে কাজ করবে (দোকানদারের দৃষ্টিকোণ থেকে)

App-এর গ্রাহক ফর্দ page-এ প্রতিটা item-এর পাশে ৩টা status button থাকবে: **পেয়েছে / পায়নি / পরে দিবে**। দোকানদার tick দিলে গ্রাহক তার retrieval page-এ real-time দেখতে পাবে। (আগে শুধু `done: boolean` ছিল, এখন `fulfillment_status` enum হবে।)

## Database changes

নতুন/পরিবর্তিত tables:

- **`wishlist_customers`** (নতুন): per-shop স্থায়ী গ্রাহক identity
  - `id`, `shop_id`, `phone` (unique per shop), `name`, `address`, `pin_hash` (bcrypt-like, server-only check), `created_at`, `last_seen_at`
- **`customer_wishlists`** (পরিবর্তন): নতুন column `wishlist_customer_id uuid` যোগ — পুরোনো denormalized name/phone থাকবে backup হিসেবে
- **`customer_wishlist_items`** (পরিবর্তন):
  - `done boolean` → keep for backward compat
  - নতুন: `fulfillment_status text` ('pending' | 'fulfilled' | 'unavailable' | 'later'), default 'pending'
  - নতুন: `shopkeeper_note text` (কেন পায়নি — optional)
- **`wishlist_templates`** (নতুন): গ্রাহকের saved monthly template
  - `id`, `wishlist_customer_id`, `name` (যেমন "মাসিক বাজার"), `items jsonb`, `created_at`

RLS:
- `wishlist_customers`: public INSERT/SELECT/UPDATE শুধু edge function-এর service role দিয়ে; shop members read-only own shop's customers
- `wishlist_templates`: শুধু edge function via PIN auth

## Edge functions

1. **`submit-wishlist`** (update): `pin` input accept করবে। যদি `(shop_id, phone)` জোড়া আগে থাকে → PIN verify করবে; না থাকলে নতুন customer + auto-PIN তৈরি করে response-এ PIN পাঠাবে যেন UI দেখাতে পারে।
2. **`customer-wishlist-login`** (নতুন): `{ slug, phone, pin }` → verify → return short-lived signed token (HMAC, 30-day) ব্রাউজার localStorage-এ রাখবে।
3. **`customer-wishlist-history`** (নতুন): `{ token }` → return all wishlists + items + fulfillment status + saved templates।
4. **`customer-wishlist-resend`** (নতুন): `{ token, template_id | wishlist_id, items_override }` → নতুন wishlist তৈরি করে।
5. **`save-wishlist-template`** (নতুন): template save।

PIN reset: এই iteration-এ গ্রাহক যদি PIN ভুলে যায় → দোকানদার app থেকে "PIN reset" করে দিতে পারবে (গ্রাহকের পরবর্তী visit-এ নতুন PIN auto-generate)।

## নতুন routes (frontend)

- `src/routes/f.$slug.my.tsx` — গ্রাহকের login + history + per-item fulfillment view + "আবার পাঠান" + templates
- `src/routes/f.$slug.tsx` (update) — submit হওয়ার পর confirmation-এ PIN + personal link দেখানো; URL query `?reuse={wishlist_id}` থাকলে items pre-fill
- `src/routes/app.customer-wishlist.tsx` (update) — প্রতিটা item-এ fulfillment status dropdown (পেয়েছে / পায়নি / পরে) + customer history link

## UX flow summary

```text
First time:
  /f/{slug}  →  fill form  →  submit  →  confirmation
                                          │
                                          ├─ "আপনার PIN: 482913" (copy button)
                                          ├─ "আপনার ফর্দ link: /f/{slug}/my" (copy + WhatsApp share)
                                          └─ "নতুন ফর্দ" / "আমার ফর্দ দেখুন"

Returning customer:
  /f/{slug}/my  →  phone + PIN login  →  history list
                                          │
                                          ├─ ফর্দ #5 (১৫ এপ্রিল) ✅ ১০ পেয়েছি, ❌ ২ পাইনি, total ৳১২৫০
                                          │   └─ "এটাই আবার পাঠান" → pre-filled form
                                          │
                                          └─ Templates: "মাসিক বাজার" → "এখন পাঠান"
```

## File changes summary

- নতুন migration: tables + columns + RLS উপরে বর্ণিত
- নতুন edge functions: `customer-wishlist-login`, `customer-wishlist-history`, `customer-wishlist-resend`, `save-wishlist-template`
- update edge function: `submit-wishlist` (PIN handling, customer linking)
- নতুন route: `src/routes/f.$slug.my.tsx`
- update routes: `src/routes/f.$slug.tsx`, `src/routes/app.customer-wishlist.tsx`

## নিরাপত্তা

- PIN bcrypt-style hash (server-only verify) — কখনো client-এ raw PIN store হবে না, শুধু signed session token
- Rate limit: same phone থেকে 1 মিনিটে সর্বোচ্চ ৫ login চেষ্টা (in-memory in edge function বা simple table)
- All input Zod-style validation edge function-এ

Approve করলে এই plan অনুযায়ী implement শুরু করব।