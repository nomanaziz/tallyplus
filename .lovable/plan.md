## Problem 1: `/vendor/file-server` shows "দোকান পাওয়া যায়নি"

**Root cause:** `src/pages/vendor/Username.tsx` queries the `shops` and `products` tables directly with the regular supabase client (anon role). RLS on `public.shops` only allows owners/members/admins to SELECT — there is no public policy. Same for `products`. So anonymous shoppers cannot load the public storefront, even though the shop `file-server` exists and is `marketplace_enabled = true`.

The marketplace listing/grid works because `marketplace_listings` does have a public read policy and the marketplace browse pages call the `marketplace-public` edge function (which uses the service-role admin client and bypasses RLS).

**Fix:** Switch `Username.tsx` to load shop + listings + products through the existing `marketplace-public` edge function using `action: "shop-by-username"` (already implemented at line 250) and a new `action: "shop-products"` (or extend `shop-by-username` to return products in one round-trip).

- Update `marketplace-public/index.ts` so `shop-by-username` returns `{ shop, listings, products }` (mirrors the `shop` action).
- Refactor `Username.tsx` to call the function and stop using the anon `supabase.from("shops")` / `supabase.from("products")` queries.
- Same fix applied where needed in `src/pages/shop/p/Id.tsx` (already uses the function — verify) and `src/pages/shop/s/Slug.tsx` (likely the same RLS bug).

## Problem 2: Convert public storefront into a real e-commerce flow with cart + checkout + consumer accounts

Today there is a localStorage `consumer-cart` and "Add to list" buttons on cards, but no cart page, no checkout, and no order submission tied to a consumer account. Orders table (`marketplace_orders` + `marketplace_order_items`) already exists with delivery_charge, subtotal, status, etc.

### What we'll build

**1. Cart page — `/cart`**
- Lists items grouped by shop (since each shop has its own delivery, payment, policies).
- Qty +/- and remove controls (uses `consumer-cart.ts`).
- Per-shop subtotal; "Checkout this shop" button.

**2. Checkout page — `/checkout/$shopId`**
- Shows items belonging to that shop only (multi-shop carts checkout one shop at a time — matches how `marketplace_orders` is shop-scoped).
- Consumer must be logged in. If not authenticated as a consumer:
  - Show inline auth panel with two tabs: **Login** and **Register**.
  - Both use phone + PIN (existing `customer-signup-with-pin` and `customer-login-with-pin` edge functions, used by the `/customer` portal).
  - On success, account is `consumer` role; the page proceeds to checkout.
- Form: Name (prefilled from `consumer_profiles`), Phone (prefilled, read-only), Address, optional Note, payment method (Cash on Delivery default).
- Delivery zones: fetch from `delivery_zones` for that shop (if table exists; otherwise omit charge).
- "Place order" → inserts into `marketplace_orders` + `marketplace_order_items`, clears cart for that shop, redirects to `/orders/$orderNo` with a success screen.

**3. Order success/tracking page — `/orders/$orderNo`**
- Read-only order summary, status, shop contact.

**4. Header cart badge**
- Add a cart icon with item-count badge to `SiteHeader` (visible on storefront/marketplace pages) linking to `/cart`.

**5. Consumer auth context check**
- Reuse existing `customer-login-with-pin` / `customer-signup-with-pin` edge functions.
- Add a tiny `useConsumerSession` hook that wraps `supabase.auth.getUser()` + checks the `consumer` role via `is_consumer` (already in DB).

### Database

`marketplace_orders` already supports anonymous orders (no FK to consumer). We will additionally store the consumer's `user_id` for "My orders" history.

Migration:
```sql
ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS consumer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Public insert policy for marketplace orders (already may exist — verify)
-- Allow consumers to read their own orders:
CREATE POLICY "consumer reads own orders" ON public.marketplace_orders
  FOR SELECT USING (consumer_user_id = auth.uid());
```

(Existing public-insert policy will be checked first; only added if missing.)

### Files to create / change

**Edge function**
- `supabase/functions/marketplace-public/index.ts` — extend `shop-by-username` to also return `listings` + `products`. Add `place-order` action that validates stock, creates the order with admin client, and links `consumer_user_id` from the JWT.

**New pages**
- `src/pages/shop/Cart.tsx` (route `/cart`)
- `src/pages/shop/Checkout.tsx` (route `/checkout/:shopId`)
- `src/pages/shop/OrderSuccess.tsx` (route `/orders/:orderNo`)
- `src/components/shop/ConsumerAuthPanel.tsx` — phone + PIN login/register tabs.
- `src/lib/consumer-session.ts` — small hook returning `{ user, isConsumer, profile }`.

**Edits**
- `src/pages/vendor/Username.tsx` — switch to edge-function fetch.
- `src/pages/shop/s/Slug.tsx` — same fix if needed.
- `src/components/site/SiteHeader.tsx` — add cart icon + badge.
- `src/lib/app-routes.tsx` — register `/cart`, `/checkout/:shopId`, `/orders/:orderNo`.
- `src/lib/consumer-cart.ts` — add `getCartByShop`, `clearShopCart`, `useCart` (full list hook).

### Out of scope (can be added later if you want)
- Online payments (current plan: Cash on Delivery only).
- Reviews / ratings.
- Wishlist sync to server.

Confirm and I'll implement.