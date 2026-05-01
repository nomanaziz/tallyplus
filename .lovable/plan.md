## সমস্যা

DB-তে চেক করে দেখলাম বর্তমানে ৭টা shop-এর মধ্যে শুধু **১টায়** `wishlist_slug` set আছে — বাকি ৬টায় NULL। কারণ:

- `wishlist_slug` কলামটা শুধু **একটা পুরোনো migration**-এ existing shops-এর জন্য একবার backfill হয়েছিল।
- `shops` insert/create flow-এ নতুন shop-এর জন্য `wishlist_slug` auto-generate করা হয় না।
- ফলে নতুন shop owner যখন দোকান খুলেন, তার ফর্দ link generate হয় না (`vendor/Username.tsx`-এ "ফর্দ লিঙ্ক এখনো নেই" দেখায়, dashboard-এ link copy করা যায় না)।

User-এর প্রস্তাব ভাল: **আলাদা random slug-এর ঝামেলা না করে — shop-এর নিজের identifier (username বা শহরের নাম) এর শেষে `/forward` যোগ করেই ফর্দ link বানানো হোক**। তাহলে যেকোনো নতুন shop খুললেই তার URL-এর শেষে `/forward` দিলেই ফর্দ পাঠানো যাবে — কোনো alaada generation দরকার নেই।

## সমাধান (২ স্তরে)

### স্তর ১: DB ও routing — primary identifier দিয়ে fordo URL

**নতুন route যোগ:** `/{username}/forward` এবং `/shop/s/{slug}/forward` (existing `/f/:slug`-ও backward compatible থাকবে)।

**Routing change (`src/lib/app-routes.tsx`):** 
- `vendor/:username` route-এর child হিসেবে `forward` যোগ করব → `/vendor/:username/forward` এবং reusable shortcut `/{username}/forward`-ও support করার জন্য একটা catch-all রুট `/:handle/forward` যোগ করব যেটা `username`/`slug`/`wishlist_slug` যেকোনোটাতে match করবে।
- `/shop/s/:slug` এর child হিসেবেও `forward` যোগ করা হবে।

**Edge function update (`supabase/functions/wishlist-shop-info`, `submit-wishlist`, `customer-wishlist-login`):** 
- বর্তমানে এগুলো শুধু `wishlist_slug` দিয়ে শপ খোঁজে। 
- update করব যাতে input `slug` কে আগে `wishlist_slug`-এ match করে, না পেলে `username`-এ, না পেলে `slug`-এ match করে। এক জায়গায় একটা helper function `resolveShopByHandle(slug)` বানাব যেটা তিনটায় try করবে।

### স্তর ২: পুরোনো `/f/:slug` link backward-compatible রাখা

বর্তমান QR কোড / শেয়ার করা পুরোনো `/f/{wishlist_slug}` link কাজ করতে থাকবে। শুধু resolver function-টা username/slug ও handle করবে।

### স্তর ৩: Auto-generate fallback slug (safety net)

যেহেতু কিছু shop-এর `username` ও `slug` দুটোই NULL (DB query-তে দেখলাম ৬টা shop-এ দুটোই null), তাদের জন্য:

- Migration: `shops` table-এ একটা **trigger** যোগ করব যা insert/update-এ যদি `wishlist_slug` NULL হয়, auto একটা random ৬-অক্ষরের slug generate করে দেবে। এটা backfill-এর সমান logic।
- Backfill: existing NULL সব shop-এর জন্য slug generate করব।
- ফলে owner-দের কোনো setup ছাড়াই — যদি username থাকে তাহলে `/{username}/forward`, না থাকলে fallback `/f/{auto-slug}` দু'টোই কাজ করবে।

### স্তর ৪: UI fix

- **`src/pages/vendor/Username.tsx`** (line 165-180): `wishlistSlug` না থাকলেও যদি `username` থাকে, "ফর্দ পাঠান" button enable করব এবং নতুন route `/vendor/$username/forward` এ link করব।
- **`src/pages/app/CustomerWishlist.tsx`** (line 89-91, owner dashboard-এ link দেখানো): যদি shop-এর `username` থাকে → preferred link `${origin}/{username}/forward` দেখাব, না থাকলে fallback `${origin}/f/{wishlist_slug}`। দু'টোই QR/copy করা যাবে।
- **`src/pages/shop/Index.tsx`** (line 416, 464): same logic — username থাকলে `/{username}/forward`, না হলে `/f/{wishlist_slug}`।

## কী পরিবর্তন হবে — সংক্ষেপে

| File | পরিবর্তন |
|---|---|
| New migration | `wishlist_slug` auto-generate trigger + NULL backfill |
| `src/lib/app-routes.tsx` | `vendor/:username` ও `shop/s/:slug` এ `forward` child route যোগ |
| `supabase/functions/wishlist-shop-info/index.ts` | handle resolver: wishlist_slug → username → slug |
| `supabase/functions/submit-wishlist/index.ts` | একই resolver |
| `supabase/functions/customer-wishlist-login/index.ts` | একই resolver |
| `src/pages/vendor/Username.tsx` | "ফর্দ পাঠান" button সবসময় active, prefer username link |
| `src/pages/app/CustomerWishlist.tsx` | username-based fordo link দেখাবে (with QR) |
| `src/pages/shop/Index.tsx` | marketplace card-এ username-based link |
| New route file: `src/pages/f/forward/Handle.tsx` (বা existing `f/Slug.tsx` reuse করব path param দিয়ে) | `/vendor/:username/forward` ও `/shop/s/:slug/forward` কে existing `f/Slug.tsx` component-এ map করব handle prop দিয়ে |

## ফলাফল

- নতুন shop খুললেই owner কোনো extra setup ছাড়া fordo link পেয়ে যাবে — তার URL: `tallyplus.lovable.app/{username}/forward` (অথবা `/f/{auto-slug}` fallback)।
- পুরোনো সব `/f/{wishlist_slug}` link কাজ করতে থাকবে।
- QR code/share — সব username-based clean URL দেখাবে।

## আপনার approval দরকার

আমি কি **`/{username}/forward`** pattern-এ যাব (clean), নাকি `/f/{username}` (existing pattern-এর কাছাকাছি)? ডিফল্ট ধরে `/{username}/forward` এ যাচ্ছি যেটা আপনি বললেন — approve করলে implement শুরু করি।
