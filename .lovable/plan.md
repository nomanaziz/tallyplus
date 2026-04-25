## অনলাইন শপ — ভেন্ডর ড্যাশবোর্ড + Username-based পাবলিক পেজ

বর্তমানে `/app/online-shop` ভুলভাবে public marketplace listing দেখাচ্ছে। সঠিক behavior: এটা **ভেন্ডরের নিজের অনলাইন স্টোর management dashboard** হবে — ঠিক স্ক্রিনশটের মতো (Hishabee-style multi-vendor)। আর প্রতিটি ভেন্ডরের পাবলিক স্টোরের URL হবে `tally-smart-app.lovable.app/{username}` ফরম্যাটে।

### ১. Database migration (`shops` টেবিল)

- নতুন `username` কলাম যোগ (text, unique, lowercase, alphanumeric + `_-`, 3–32 char)। শপ তৈরির সময় `slug` থেকে auto-generate, বা owner manually সেট করতে পারবেন।
- নতুন কলাম: `terms_and_conditions` (text), `return_policy` (text), `shipping_policy` (text), `about` (text), `facebook_url`, `whatsapp_number` (text)।
- নতুন টেবিল `shop_visits` (id, shop_id, visited_at, ip_hash) — Website Visit count এর জন্য। RLS: শুধু owner read, anyone insert (rate-limited via edge function)।
- index: `shops.username` unique।

### ২. ভেন্ডর ড্যাশবোর্ড — `/app/online-shop` route সম্পূর্ণ নতুন করে

স্ক্রিনশটের layout হুবহু:

**Top section (full-width banner)**
- DashboardBannerCarousel reuse করে অনলাইন-শপ-related banners

**Stats grid (4 cards)**
- Active Order (orders count where status=pending)
- Online Product (published marketplace_listings count)
- Total Earning (sum of completed online orders)
- Website Visit (shop_visits count)

**Quick actions row (3 cards)**
- **Website** — opens `/{username}` in new tab
- **Copy Link** — copies full public URL to clipboard
- **QR Code** — dialog showing QR code of public URL (use existing `qrcode` lib if available, otherwise add)

**Tools grid (4×3 = 12 tiles)** — প্রতিটি tile একটা route বা dialog খোলে:
1. **Message** → `/app/online-shop/messages` (placeholder for now)
2. **Store Settings** → dialog/route to edit name, logo, cover, tagline, address, phone, **username**
3. **Online Product** → `/app/online-shop/products` (manage marketplace_listings — publish/unpublish, set price/stock/warranty)
4. **Order List** → `/app/online-shop/orders` (placeholder for now)
5. **Themes** → placeholder ("শীঘ্রই আসছে")
6. **Own Domain** → **সরানো হবে** (user বলেছেন custom domain থাকবে না — replace by **"Username পরিবর্তন"** tile যেটা settings dialog খোলে)
7. **Delivery** → placeholder
8. **Build App** → placeholder
9. **Featured Products** → `/app/online-shop/featured` (mark listings as featured)
10. **Marketing & SEO** → dialog to edit shop meta description, keywords
11. **Shop Policy** → dialog to edit terms_and_conditions, return_policy, shipping_policy
12. **Fraud Check** → placeholder
13. **Promo Code** → `/app/online-shop/promo-codes` (placeholder)
14. **Customization** → placeholder

প্রথম release-এ functional হবে: **Store Settings, Online Product, Shop Policy, Website/Copy Link/QR**। বাকিগুলো "শীঘ্রই আসছে" placeholder দেখাবে।

### ৩. Username-based public store URL

বর্তমানে public shop পেজ হলো `/shop/s/$slug`। নতুন route যোগ:

- **`src/routes/$username.tsx`** — top-level catch route যেটা username দেখে shop fetch করবে এবং `shop.s.$slug.tsx`-এর content render করবে।
  - reserved usernames list (`app`, `admin`, `auth`, `shop`, `pricing`, `affiliate`, `f`, `api`, `_`, ইত্যাদি) → 404 redirect, যাতে existing routes break না হয়।
  - SSR-safe head() with shop name/logo as og:image।
- পুরোনো `/shop/s/$slug` route reachable থাকবে backward compat-এর জন্য, কিন্তু canonical link হবে `/{username}`।
- "Online Marketplace" public listing (`/shop`) আগের মতই থাকবে — ওটা সব ভেন্ডরের সম্মিলিত মার্কেট, যা landing page header থেকে accessible (গত turn-এ যোগ করা)।

### ৪. ভেন্ডর dashboard থেকে link generation

```ts
const publicUrl = `${window.location.origin}/${shop.username}`;
```
Website tile, Copy Link, QR — সবকিছু এই URL-ভিত্তিক।

### ৫. Edge function update

- `marketplace-public` function-এ নতুন `action: "shop-by-username"` যোগ যাতে public route fetch করতে পারে।
- visit logging-এর জন্য নতুন action `action: "log-visit"` (rate-limited)।

### Files Modified / Created

**Migration:**
- `supabase/migrations/<ts>_shop_username_and_policies.sql` — username, policy fields, shop_visits table, RLS

**Routes:**
- `src/routes/app.online-shop.tsx` — সম্পূর্ণ নতুন vendor dashboard (replace existing)
- `src/routes/app.online-shop.products.tsx` — listings management (publish/price/stock/warranty)
- `src/routes/app.online-shop.featured.tsx` — featured selection
- `src/routes/$username.tsx` — public store by username
- `src/routes/__root.tsx` বা router config — reserved usernames handling

**Components:**
- `src/components/app/online-shop/StoreSettingsDialog.tsx` — name, username, logo, cover, contact
- `src/components/app/online-shop/ShopPolicyDialog.tsx` — terms / return / shipping
- `src/components/app/online-shop/QrCodeDialog.tsx` — public URL এর QR

**Edge:**
- `supabase/functions/marketplace-public/index.ts` — `shop-by-username` + `log-visit` actions

**Sidebar:**
- কোনো পরিবর্তন নেই — "অনলাইন শপ" ইতিমধ্যে "অনলাইন বিক্রি" section-এ আছে।

### প্রথম iteration scope

বড় কাজ — Migration + dashboard layout (12 tiles) + Store Settings dialog (with username) + Shop Policy dialog + Online Product management page + `/{username}` public route + QR/Copy Link working। Themes/Build App/Delivery/Fraud Check/Promo Code/Customization/Messages/Orders tiles ক্লিক করলে toast দেখাবে "শীঘ্রই আসছে"। পরবর্তী turn-এ একে একে functional করা যাবে।
