## Online Shop — fix dashboard tiles & build out feature pages

### 1. Dashboard tile cleanup (`app.online-shop.index.tsx`)
- Remove the duplicate **"Username পরিবর্তন / Change Username"** tile (username editing already lives inside Store Settings).

### 2. Delivery page (`app.online-shop.delivery.tsx`) — replace placeholder
New table `shop_delivery_zones` (migration):
```
id uuid pk, shop_id uuid, name text, charge numeric,
free_shipping_min numeric null, sort_order int, is_active bool,
created_at, updated_at
```
RLS: shop members read/write; admins read.

On first visit, if shop has no zones, auto-seed two defaults:
- **ঢাকার ভিতরে (Inside Dhaka)** — ৳60
- **ঢাকার বাইরে (Outside Dhaka)** — ৳120

UI:
- List each zone as a card with: name, delivery charge, optional "free shipping above ৳X", active toggle.
- Edit (pencil) → dialog to update name, charge, free-shipping threshold, active.
- "Add new zone" button → same dialog (blank).
- Delete option in row menu.

Auto-seed runs once per shop (insert only if count = 0).

### 3. Featured Products page (`app.online-shop.featured.tsx`) — replace placeholder
- Query `products` for current shop where `is_featured = true AND is_marketplace_published = true AND deleted_at IS NULL`.
- Show grid of cards (image, name, price, stock).
- Each card has a Switch to toggle `is_featured` off (removes from featured).
- Empty state with link back to "Online Product" page explaining: tick the ⭐ on any online product to feature it here.
- Note above grid: "ফিচার্ড পণ্যগুলো ওয়েবসাইটের হোমপেজে আগে দেখানো হবে।"

### 4. Marketing & SEO page (`app.online-shop.marketing.tsx`) — replace placeholder
Edits fields on `shops` table (already exist: `meta_description`, `tagline`, plus we add `meta_title`, `meta_keywords`, `og_image_url`, `google_analytics_id`, `facebook_pixel_id` via migration if missing).

Sections:
- **SEO**: Meta title, meta description (textarea, 160 char counter), keywords (comma list), OG image upload (uses `shop-logos` bucket).
- **Analytics**: Google Analytics ID, Facebook Pixel ID inputs.
- **Marketing tagline**: shop tagline (already exists).
- Sticky save button.

### 5. Shop Policy page (`app.online-shop.policy.tsx`) — replace placeholder
Three accordion/tab sections editing existing `shops` columns: `terms_and_conditions`, `return_policy`, `shipping_policy`. Add a fourth field `privacy_policy` (migration adds column).
- Each section: large textarea + "Insert default template" button (prefilled Bangla template).
- Sticky save.

### 6. Promo Code page (`app.online-shop.promo-codes.tsx`) — fix add button
Current page already has an `AddPromoDialog` and a fixed bottom "Add Promo Code" button — verify it renders. Add **Free Shipping** option:

- Extend `discount_type` choices: `percent`, `amount`, **`free_shipping`**.
- When type = `free_shipping`: hide discount value input, only show "minimum order amount" (e.g., free shipping above ৳1000).
- Help text under each type explaining behaviour.
- Validation: min_order_amount required for free_shipping.

The existing UI already supports percent/amount + min order; we just add the third option and the conditional field rendering.

### 7. Database migrations
```sql
-- Delivery zones
create table public.shop_delivery_zones (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null,
  name text not null,
  charge numeric not null default 0,
  free_shipping_min numeric,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shop_delivery_zones enable row level security;
create policy "zones read shop" on public.shop_delivery_zones for select
  using (is_shop_member(auth.uid(), shop_id) or is_admin(auth.uid()));
create policy "zones write shop" on public.shop_delivery_zones for all
  using (is_shop_member(auth.uid(), shop_id))
  with check (is_shop_member(auth.uid(), shop_id));

-- Marketing/SEO + privacy fields on shops
alter table public.shops
  add column if not exists meta_title text,
  add column if not exists meta_keywords text,
  add column if not exists og_image_url text,
  add column if not exists google_analytics_id text,
  add column if not exists facebook_pixel_id text,
  add column if not exists privacy_policy text;
```

### Files
- **Edit**: `src/routes/app.online-shop.index.tsx` (remove username tile)
- **Replace**: `src/routes/app.online-shop.delivery.tsx`, `app.online-shop.featured.tsx`, `app.online-shop.marketing.tsx`, `app.online-shop.policy.tsx`
- **Edit**: `src/routes/app.online-shop.promo-codes.tsx` (add free-shipping type + conditional fields)
- **Migration**: 1 SQL file with the schema above

### Out of scope
- Wiring delivery zones into the customer checkout flow (only the management UI is built now). Can be added next.
