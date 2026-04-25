# Marketplace + গ্রাহক Account Plan

বর্তমানে `marketplace_products` (canonical, admin-managed) এবং `marketplace_listings` (per-shop seller listing) আগে থেকেই আছে, কিন্তু কোনো public marketplace UI নেই, এবং গ্রাহকের আলাদা account নেই। নিচের plan-এ এই দুটোকে একসাথে যুক্ত করা হবে।

---

## 1. গ্রাহক (Consumer) Account System

### Auth flow পরিবর্তন
- `/auth` page-এ এখন শুধু shop owner login. এটাকে **dual-mode** card বানানো হবে:
  - Tab ১: **দোকান মালিক** (existing shop signup/login — phone + 4-digit PIN)
  - Tab ২: **গ্রাহক** (consumer signup/login — phone + 4-digit PIN)
- "Create account" button-এ গেলে আগে account type select করতে হবে: *দোকান মালিক* / *গ্রাহক*।
- Login form একই page-এ — phone+PIN দিলে system auto-detect করবে user কোন ধরনের।

### Database
- নতুন table: `consumer_profiles`
  - `id uuid → auth.users.id` (FK, cascade)
  - `name`, `phone` (unique), `address`, `default_lat/lng`, `avatar_url`, `created_at`
- নতুন table: `consumer_favourite_shops`
  - `consumer_id`, `shop_id`, `created_at` (unique pair) — "প্রিয় দোকান"
- নতুন enum value `consumer` যোগ হবে `app_role`-এ; `handle_new_user` trigger আপডেট করে user metadata-র `account_type` দেখে owner বা consumer role assign করবে।
- নতুন edge function: `signup-consumer-with-pin` (existing `signup-with-pin`-এর pattern)। Login function shared থাকবে (`login-with-pin`) — শুধু role check.

### Routing
- নতুন route group `/shop/*` (consumer-facing app):
  - `/shop` — marketplace browse (public, login optional)
  - `/shop/s/$slug` — individual shop page (logo, name, listings)
  - `/shop/p/$id` — product detail page
  - `/shop/me` — গ্রাহক dashboard (orders sent, saved ফর্দ, favourite shops) — login required
- Shop owner-রা আগের মতোই `/app/*`-এ যাবে। Login-এর পরে role দেখে redirect: owner → `/app/dashboard`, consumer → `/shop`।

---

## 2. Public Marketplace

### Shop owner side (`/app`)
- `app.products.tsx`-এ প্রতিটা product-এ একটা toggle: **"অনলাইনে বিক্রি করব"**। On করলে সেই product-এর জন্য `marketplace_listings` row create/update হবে (price, stock, min_order from product table)।
- নতুন route `/app/online-shop` (placeholder আছে already) — এখানে shop owner দেখবে কোন product গুলো online-এ live, price/stock edit করতে পারবে, এবং shop's public page link পাবে (`/shop/s/{slug}`)।
- Shop owner-এর জন্য একটা "online shop profile" form: logo (already in shops table), tagline, cover image, delivery area — এগুলোর জন্য `shops` table-এ `tagline`, `cover_url`, `marketplace_enabled boolean` column add করা হবে।

### Public marketplace pages
- `/shop` — সব published listing-এর grid: product image, name, price, shop name+logo। Filter by category, search, sort by price/recent। Pagination।
- `/shop/s/$slug` — individual shop's storefront: cover, logo, tagline, address, contact, listed products grid।
- `/shop/p/$id` — product detail: images, description, price, shop info, "ফর্দে যোগ করুন" button, "এই দোকানের সাথে যোগাযোগ" (WhatsApp link)।
- Anyone can browse anonymously; কেবল ফর্দ save / send করতে গেলে consumer login লাগবে।

---

## 3. গ্রাহক ফর্দ (Saved Carts) — Marketplace Integration

বর্তমানে `customer_wishlists` + `wishlist_customers` system আছে শুধু per-shop wishlist link (`/f/$slug`)-এর জন্য। এটাকে authenticated consumer accounts-এর সাথে মেলানো হবে।

### Database
- `customer_wishlists`-এ নতুন nullable column: `consumer_user_id uuid` (auth.users id) — যদি logged-in consumer সাবমিট করে।
- নতুন table: `consumer_saved_carts`
  - `id`, `consumer_user_id`, `name` (e.g. "মাসিক বাজার"), `items jsonb` (name, qty, unit, note), `created_at`, `updated_at`
- নতুন table: `consumer_cart_items` *(in-progress active cart)* — অথবা simply localStorage + একটা single "active cart" row। **Simple approach: active cart = localStorage; saved carts = `consumer_saved_carts` rows।**

### UX flow
1. Consumer marketplace থেকে product browse করে "ফর্দে যোগ করুন" চাপলে item active cart-এ যাবে (localStorage; logged-in হলে server sync)।
2. `/shop/me/cart` — current ফর্দ দেখা, edit, delete।
3. **"ফর্দ save করুন"** button — name দিয়ে save করলে `consumer_saved_carts`-এ store হবে।
4. **"দোকানে পাঠান"** button — favourite shops list থেকে একটা select করে submit। Backend-এ এটা `submit-wishlist` edge function-কে call করবে (shop slug দিয়ে), শুধু consumer_user_id-ও pass করা হবে যাতে shop owner দেখতে পারে কে পাঠিয়েছে।
5. `/shop/me` dashboard:
   - **আমার ফর্দ** (saved carts) — reorder, edit, send to shop
   - **পাঠানো ফর্দ** (history) — কোন shop, কবে, status (pending/received/delivered)
   - **প্রিয় দোকান** — manage favourite shops list

### Shop owner side
- Existing `/app/customer-wishlist` page এমনিতেই দেখাবে — শুধু consumer-attached submissions-এ একটা badge ("নিবন্ধিত গ্রাহক") add হবে।

---

## 4. Implementation Order (incremental, low-risk)

1. **Schema migration**: `consumer_profiles`, `consumer_favourite_shops`, `consumer_saved_carts`, app_role enum extend, shops table 3 new columns, customer_wishlists.consumer_user_id, RLS policies।
2. **Consumer auth**: dual-mode `/auth` UI + `signup-consumer-with-pin` edge function + handle_new_user trigger update।
3. **Public marketplace routes**: `/shop`, `/shop/s/$slug`, `/shop/p/$id` (read-only, anonymous OK)।
4. **Shop owner online toggle**: `/app/products` row toggle + `/app/online-shop` revamp (replace placeholder)।
5. **Cart + saved ফর্দ + send to shop** flow: `/shop/me`, `/shop/me/cart`, send-cart edge function।
6. **Polish**: favourites management, order history view, shop owner badge for registered consumers।

---

## Open Questions (will ask before coding)

1. গ্রাহক কি একই ফোন নাম্বার দিয়ে shop owner হিসেবেও registered থাকতে পারবে, নাকি ১ ফোন = ১ account type?
2. Marketplace-এ payment/checkout লাগবে নাকি শুধু "ফর্দ পাঠানো" (shop owner WhatsApp/call করে confirm) দিয়েই হবে? — *Plan-এ এখন ফর্দ-only ধরা হলো, কারণ আপনি "simple" বলেছেন*।
3. Consumer-এর জন্য email/OTP-based reset লাগবে কিনা, নাকি শুধু PIN যথেষ্ট?

Approve করলে আমি step ১ (migration) থেকে শুরু করব।
