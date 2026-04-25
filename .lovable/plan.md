## লক্ষ্য

Online Shop এর dashboard থেকে accessible সব sub-page গুলো screenshot এর মতো করে বানিয়ে দেওয়া। প্রতিটা page এর নিজস্ব route থাকবে এবং dashboard tile click করলে সেখানে navigate করবে।

## Sub-pages overview

| # | Page | Route | এই plan এ status |
|---|------|-------|------------------|
| 1 | Store Settings (full page, screenshot অনুযায়ী) | `/app/online-shop/settings` | পূর্ণ rebuild |
| 2 | Online Products (Published / Unpublished tabs + Feature toggle) | `/app/online-shop/products` | redesign |
| 3 | Order List (On Order / Ongoing / Completed tabs) | `/app/online-shop/orders` | নতুন |
| 4 | Themes (Web themes + App themes tabs, ৩টা web + ২টা mobile) | `/app/online-shop/themes` | নতুন |
| 5 | Delivery (Inside/Outside Dhaka, Shipping Packages) | `/app/online-shop/delivery` | নতুন |
| 6 | Featured Product (empty state + how-it-works) | `/app/online-shop/featured` | নতুন |
| 7 | Marketing & SEO (Sitemap, FB feed, GTM, FB Pixel, Description) | `/app/online-shop/marketing` | নতুন |
| 8 | Shop Policy (About us, Privacy, Terms, Return — accordion editor) | `/app/online-shop/policy` | redesign (page) |
| 9 | Fraud Check (courier API integration + mobile lookup) | `/app/online-shop/fraud-check` | নতুন |
| 10 | Promo Code (list + create/edit promo codes) | `/app/online-shop/promo-codes` | নতুন |

Build App tile সরিয়ে দেওয়া হবে (আপনি বললেন দরকার নেই)।

## Database changes (একটাই migration)

```sql
-- Shop banner + social links + delivery settings (json)
alter table shops
  add column if not exists banner_url text,
  add column if not exists social_links jsonb default '{}'::jsonb,  -- {facebook, instagram, tiktok, youtube}
  add column if not exists active_web_theme text default 'classic',
  add column if not exists active_app_theme text default 'default',
  add column if not exists fb_pixel_id text,
  add column if not exists fb_pixel_token text,
  add column if not exists fb_pixel_test_id text,
  add column if not exists gtm_id text,
  add column if not exists about_us text,
  add column if not exists privacy_policy text,
  add column if not exists fraud_api_key text,
  add column if not exists fraud_api_provider text;  -- 'bdcourier' | 'redx' ইত্যাদি

-- Shop policy column rename: শুধু about → about_us migration handled above

-- Shipping packages (inside/outside Dhaka সহ যেকোনো এলাকা)
create table public.shipping_packages (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,                    -- "Inside Dhaka" / "Outside Dhaka" / যেকোনো
  area_type text not null,               -- 'inside_dhaka' | 'outside_dhaka' | 'custom'
  price numeric not null default 0,
  delivery_time text,                    -- "১-২ দিন"
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table shipping_packages enable row level security;
create policy "Shop owners manage shipping" on shipping_packages
  for all using (shop_id in (select id from shops where owner_id = auth.uid()))
  with check (shop_id in (select id from shops where owner_id = auth.uid()));
create policy "Public read active shipping" on shipping_packages for select using (is_active = true);

-- Promo codes
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  code text not null,
  discount_type text not null,           -- 'percent' | 'flat'
  discount_value numeric not null,
  min_order_amount numeric default 0,
  max_uses int,
  used_count int default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (shop_id, code)
);
alter table promo_codes enable row level security;
create policy "Shop owners manage promo" on promo_codes
  for all using (shop_id in (select id from shops where owner_id = auth.uid()))
  with check (shop_id in (select id from shops where owner_id = auth.uid()));

-- products এ featured flag (already published flag আছে)
alter table products add column if not exists is_featured boolean default false;

-- marketplace_listings এ featured mirror
alter table marketplace_listings add column if not exists is_featured boolean default false;

-- Fraud check log (cache results)
create table public.fraud_check_logs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  phone text not null,
  result jsonb,
  checked_at timestamptz default now()
);
alter table fraud_check_logs enable row level security;
create policy "Owner reads fraud logs" on fraud_check_logs
  for all using (shop_id in (select id from shops where owner_id = auth.uid()))
  with check (shop_id in (select id from shops where owner_id = auth.uid()));
```

## প্রতিটা page এর key features

### 1. Store Settings (`/app/online-shop/settings`)
Screenshot অনুযায়ী full page (আগে dialog ছিল):
- Online Shop Publish/Unpublish toggle (badge সহ)
- Logo + Shop Name + Shop Type (read-only thread)
- Shop Banner (1920×560) — upload + preview
- Your Shop Link — username edit সহ inline
- Social Media Link (Facebook, TikTok, Instagram, YouTube — icon সহ)
- Shop Other Info: Name, Mobile, Address
- "Shop Information Update" sticky save button

### 2. Online Products (redesign)
Screenshot অনুযায়ী:
- Top tabs: **Published / Unpublished**
- Search bar + `+` Add button
- Card list: image, name, status badge, **Publish toggle**, **Feature toggle**, Sell Price, Stock, Edit Description link
- Product detail edit সরাসরি card এ

### 3. Order List (`/app/online-shop/orders`)
- Tabs: **On Order / Ongoing / Completed**
- প্রতিটা order এ customer info, items, total, status change button, fraud check shortcut

### 4. Themes (`/app/online-shop/themes`)
- Tabs: **ওয়েব থিম / অ্যাপ থিম** (screenshot এর মতো centered tab line)
- Web themes: ৩টা card — **Classic, Modern, Elegant** with mock preview image, "Preview" button, active theme = green check
- App themes: ২টা — **Default, Blue**
- Click → `active_web_theme` / `active_app_theme` save

### 5. Delivery (`/app/online-shop/delivery`)
- "Shipping Packages (n)" header + `+ Add Shipping Package` button
- Empty state: "No Shipping Packages Found"
- Add dialog: Name, Area type (Inside/Outside Dhaka/Custom), Price, Delivery time
- List item: edit/delete actions

### 6. Featured Product (`/app/online-shop/featured`)
- "See how featured product works" expandable banner → modal dialog (screenshot এর "How Featured Products Work" content সহ)
- Empty state: "Product Not Found" + "How it works" + "Online Products" buttons
- Featured products grid (যখন থাকবে): image, name, price, unfeature toggle

### 7. Marketing & SEO (`/app/online-shop/marketing`)
Screenshot অনুযায়ী cards:
- Sitemaps for Search Engine (auto-generated link + copy)
- Facebook Data Feed (auto-generated XML link + copy)
- Google Tag Manager (GTM ID input + "Show Steps" guide)
- Facebook Conversion API & Pixel (Pixel ID, Access Token, Test ID + steps)
- Details (SEO & Data Feed) — Description textarea
- Save button (sticky bottom)

### 8. Shop Policy (`/app/online-shop/policy`) — page (dialog এর জায়গায়)
Screenshot অনুযায়ী 4টা accordion section:
- About us
- Privacy Policy
- Terms and Condition
- Return and Cancellation Policy
- প্রতিটা section এ rich text editor (basic toolbar: B/I/U, list, link, image, clear)
- Bottom: "Update Shop Policy" sticky button
- প্রথমবার খুললে template content auto-fill

### 9. Fraud Check (`/app/online-shop/fraud-check`)
- Setup card: Provider dropdown (BDCourier/RedX/Pathao), API Key input, Save
- Lookup card: Phone number input → "Check" button
  - Edge function `fraud-check` call করবে → courier API → response cache `fraud_check_logs` এ
  - Result: Total Orders, Successful, Cancelled, Success rate
- Recent checks list

### 10. Promo Code (`/app/online-shop/promo-codes`)
- "Promo Codes (n)" + `+ Add Code` button
- Add dialog: Code, Discount type (% / flat), Value, Min order, Max uses, Start/Expire date, Active toggle
- List: code, discount, used/max, status badge, edit/delete

## Edge function changes
- নতুন `fraud-check` function: provider অনুযায়ী HTTP call, result return + log save
- `marketplace-public` এ `shipping-packages` action যোগ — public storefront এ delivery options দেখানোর জন্য
- `marketplace-public` এ `validate-promo` action

## Dashboard tile updates (`app.online-shop.tsx`)
- **Build App tile সরানো হবে**
- প্রতিটা tile এ proper `to` route যোগ:
  - Store Settings → `/app/online-shop/settings`
  - Order List → `/app/online-shop/orders`
  - Themes → `/app/online-shop/themes`
  - Delivery → `/app/online-shop/delivery`
  - Featured → `/app/online-shop/featured`
  - Marketing & SEO → `/app/online-shop/marketing`
  - Shop Policy → `/app/online-shop/policy`
  - Fraud Check → `/app/online-shop/fraud-check`
  - Promo Code → `/app/online-shop/promo-codes`
- "Customization" tile সরানো হবে (Themes এর duplicate)
- Active Order stat live হবে (orders table থেকে count)

## Files (create / modify)

**Create:**
- `supabase/migrations/<ts>_online_shop_full.sql`
- `supabase/functions/fraud-check/index.ts`
- `src/routes/app.online-shop.settings.tsx`
- `src/routes/app.online-shop.orders.tsx`
- `src/routes/app.online-shop.themes.tsx`
- `src/routes/app.online-shop.delivery.tsx`
- `src/routes/app.online-shop.featured.tsx`
- `src/routes/app.online-shop.marketing.tsx`
- `src/routes/app.online-shop.policy.tsx`
- `src/routes/app.online-shop.fraud-check.tsx`
- `src/routes/app.online-shop.promo-codes.tsx`
- `src/components/app/online-shop/ShippingPackageDialog.tsx`
- `src/components/app/online-shop/PromoCodeDialog.tsx`
- `src/components/app/online-shop/RichTextEditor.tsx` (lightweight, contentEditable based)
- `src/components/app/online-shop/ThemePreviewCard.tsx`

**Modify:**
- `src/routes/app.online-shop.tsx` — tile routes update, Build App removal
- `src/routes/app.online-shop.products.tsx` — Published/Unpublished tabs, Feature toggle, Edit Description redesign
- `supabase/functions/marketplace-public/index.ts` — shipping + promo actions

**Remove (এখন dialog হিসেবে আছে, page হবে):**
- `src/components/app/online-shop/StoreSettingsDialog.tsx` → page এ migrate
- `src/components/app/online-shop/ShopPolicyDialog.tsx` → page এ migrate

## কাজের ক্রম

1. Database migration apply (একসাথে সব column + table)
2. Dashboard tile routes/Build App removal
3. Settings page (full)
4. Products page redesign (tabs + feature toggle)
5. Themes page (static preview-only এখন; পরে real preview)
6. Delivery page + ShippingPackageDialog
7. Featured page (products থেকে is_featured filter)
8. Marketing & SEO page
9. Policy page + RichTextEditor
10. Promo Code page + dialog
11. Fraud Check page + edge function (provider mock এখন; user API key দিলে real call)
12. Orders page (existing orders schema দেখে wire-up)

আপনি approve করলে আমি ১ থেকে ১২ পর্যন্ত step-by-step build করে দেব।
