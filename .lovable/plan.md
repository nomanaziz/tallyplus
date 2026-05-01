## Goal

Make the e-commerce loop work end-to-end with minimum code: register the missing vendor online-shop routes, add a consumer "আমার অর্ডার" page, add Inside/Outside Dhaka delivery zone selection on checkout, and auto-seed default delivery zones for every shop (editable by the shopkeeper).

## Problems found

1. **`/app/online-shop/orders` 404** — All `online-shop/*` pages exist (`Orders.tsx`, `Delivery.tsx`, `Settings.tsx`, `Products.tsx`, etc.) but none are registered in `src/lib/app-routes.tsx`. The Online Shop dashboard links to `/app/n/*` which also doesn't exist.
2. **No consumer "My Orders" page** — `marketplace_orders` already stores `consumer_user_id`, but consumers can't see their order history.
3. **No delivery zone on checkout** — `Checkout.tsx` shows "Delivery: To be confirmed". `shop_delivery_zones` table exists with `name`, `charge`, `free_shipping_min`, but no shop has any rows yet, and checkout doesn't query/show them.
4. **No auto-seed of default zones** — Shopkeepers should get "ঢাকার ভিতরে" / "ঢাকার বাহিরে" by default and be able to edit/add district-wise zones.

## Plan

### 1. Register vendor online-shop routes

In `src/lib/app-routes.tsx`, add a single parent route block under `/app/`:

```
{ path: "online-shop", children: [
  { index: true, element: <Index/> },
  { path: "orders", element: <Orders/> },
  { path: "products", element: <Products/> },
  { path: "delivery", element: <Delivery/> },
  { path: "settings", element: <Settings/> },
  { path: "messages", element: <Messages/> },
  { path: "themes", element: <Themes/> },
  { path: "customize", element: <Customize/> },
  { path: "featured", element: <Featured/> },
  { path: "marketing", element: <Marketing/> },
  { path: "policy", element: <Policy/> },
  { path: "fraud-check", element: <FraudCheck/> },
  { path: "promo-codes", element: <PromoCodes/> },
] }
```

Plus an alias `{ path: "n/*", element: <Navigate to="/app/online-shop" /> }` so the `/app/n/*` links from `Index.tsx` keep working (or update `Index.tsx` to use `/app/online-shop/*` — simpler, do that).

### 2. Auto-seed default delivery zones (DB migration)

Create a trigger on `shops` insert that adds two default rows in `shop_delivery_zones`:

- "ঢাকার ভিতরে" — charge 60, sort_order 1
- "ঢাকার বাহিরে" — charge 130, sort_order 2

Also a one-time backfill `INSERT … SELECT` for existing shops that have zero zones, so every current shop immediately has defaults the shopkeeper can edit on `/app/online-shop/delivery`.

### 3. Wire delivery zones into Checkout

Update `src/pages/shop/Checkout.tsx`:

- Fetch zones for the cart's `shopId` via a new public action `marketplace-public { action: "delivery-zones", shop_id }`.
- Show zones as radio buttons (default: first active zone).
- Compute `delivery_charge` from selected zone (0 if subtotal ≥ `free_shipping_min`).
- Total = subtotal + delivery_charge.
- Pass `delivery_zone_id` and `delivery_charge` in the `place-order` body.

Update `supabase/functions/marketplace-public/index.ts`:

- Add `delivery-zones` action — public select from `shop_delivery_zones` where `shop_id=? and is_active=true`.
- Extend `place-order` to accept `delivery_zone_id` and write `subtotal`, `delivery_charge`, `total = subtotal + delivery_charge`, plus `consumer_user_id` from the caller's session if present.

### 4. Consumer "আমার অর্ডার" page

Create `src/pages/customer/MyOrders.tsx`:

- Lists `marketplace_orders` where `consumer_user_id = auth.uid()` newest first.
- Each row: shop name (join `shops`), order_no, status badge, total, created_at, link to `/orders/:orderNo` (existing `OrderSuccess` page).

Register `{ path: "my-orders", element: <MyOrders/> }` under `/customer`. Add link in `CustomerLayout` sidebar/nav.

Add RLS policy on `marketplace_orders`: `select` allowed when `consumer_user_id = auth.uid()` (in addition to existing shop-side policies).

### 5. Order Success page polish (small)

`src/pages/shop/OrderSuccess.tsx` already shows order detail. Verify it shows `subtotal`, `delivery_charge`, `total` — small UI tweak only.

## Files

**Modified**
- `src/lib/app-routes.tsx` — register online-shop and customer/my-orders routes
- `src/pages/app/online-shop/Index.tsx` — change `/app/n/*` links to `/app/online-shop/*`
- `src/pages/shop/Checkout.tsx` — delivery zone selection, totals
- `src/pages/shop/OrderSuccess.tsx` — show breakdown
- `src/pages/customer/CustomerLayout.tsx` — add "আমার অর্ডার" nav link
- `supabase/functions/marketplace-public/index.ts` — `delivery-zones` action + extend `place-order`

**Created**
- `src/pages/customer/MyOrders.tsx`
- `supabase/migrations/<ts>_default_delivery_zones_and_consumer_orders_rls.sql`
  - Trigger + function `tg_shop_seed_delivery_zones()` on insert into `shops`
  - Backfill for existing shops with 0 zones
  - RLS policy: consumer can `select` own `marketplace_orders`

## Out of scope (kept minimal as requested)

- District-by-district picker — shopkeeper can manually add district zones via existing `/app/online-shop/delivery` UI (already works).
- Returns flow on consumer side — vendor `/app/returns` already exists.
- Per-zone payment method overrides — single "Cash on Delivery" stays for now; shop's payment settings live in `/app/online-shop/settings`.
