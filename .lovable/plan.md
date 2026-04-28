# Fix Fordo Update + Owner/Customer Login Routing + Rename Labels

## Root Cause Analysis

**Phone `01922114419` (auth user `cf93f22a-…`) has BOTH:**
- A `profiles` row → registered as a shop owner (owns 2 shops: "Naeem Store", "File Server")
- A `consumer_profiles` row → also registered as a customer

**Bug in `src/pages/app/AppLayout.tsx` (lines 78–97):** The guard does:
```
if (consumer_profiles row exists) → redirect to /customer/dashboard
```
It never checks whether the user is also a shop owner. So this dual-role user, even when logging in via the দোকানদার tab and landing on `/app/dashboard`, is immediately bounced to `/customer/dashboard`.

**Why "Update fordo price" fails:** Same root cause. After the bounce, the user opens the wishlist while their session has no shop selected / they're treated as a consumer. The RLS policy on `customer_wishlist_items` requires `is_shop_member(auth.uid(), w.shop_id)`. The update returns 0 rows → the toast `"আপডেট করা গেলো না"` fires (this is exactly the empty-rows branch in `updateItemField`). Once the routing fix lets the owner stay in the shop portal with an active shop context, RLS passes and price/qty/unit updates succeed.

(Accept/cancel buttons "work" only because we already added the empty-rows handler that shows an error — but they actually fail to persist for this user too, for the same reason.)

## Plan

### 1. Fix the owner/customer routing guard (the main fix)

In `src/pages/app/AppLayout.tsx`, change the consumer redirect so it only fires when the user is **purely** a consumer (not also a shop owner / shop member):

- Query `profiles` and `shop_members` for the user in addition to `consumer_profiles`.
- Redirect to `/customer/dashboard` ONLY if:
  - a `consumer_profiles` row exists, AND
  - the user has no `profiles` row AND no `shop_members` row AND owns no `shops`.
- Otherwise treat them as an owner and stay in `/app/*`.

Mirror the inverse on the customer side (`src/pages/customer/CustomerLayout.tsx`): a dual-role user who explicitly logs in from the গ্রাহক tab should be allowed to stay in `/customer/*` — do not bounce them back to `/app/*`. The "intended portal" comes from which login function was called; `Auth.tsx` already navigates to the right destination, so each layout should only block users who genuinely don't belong there, not dual-role users.

### 2. Verify fordo item updates work after the routing fix

No code change needed in `CustomerWishlist.tsx` for the update logic itself — RLS is correct, the function is correct. After fix #1, the owner will retain an active shop context and `updateItemField` (price / qty / unit / fulfillment) will succeed.

Keep the existing "0 rows" toast as a safety net.

### 3. Rename "Customer Wishlist" → "Customer Fordo" (UI labels only)

Change visible English labels (Bangla "গ্রাহক ফর্দ" already correct). Files:

- `src/components/app/AppSidebar.tsx` — sidebar entry `en: "Customer Wishlist"` → `"Customer Fordo"`.
- `src/pages/app/CustomerWishlist.tsx`:
  - Header `"Customer Wishlists"` → `"Customer Fordo"`
  - `"Recent wishlists"` → `"Recent fordo"`
  - `"No wishlists yet"` → `"No fordo yet"`
  - Dialog title fallback `"Wishlist"` → `"Fordo"`
  - Confirm text `"Move this wishlist to recycle bin?"` → `"Move this fordo to recycle bin?"`

File names, route paths (`/app/customer-wishlist`), DB tables, type names stay unchanged — purely a label change.

## Out of Scope

- No DB migrations.
- No changes to edge functions.
- No rename of routes or tables.

## Verification After Implementation

1. Log in with `01922114419` from the **দোকানদার** tab → should land and stay on `/app/dashboard` (not bounce to `/customer/dashboard`).
2. Open Customer Fordo → open an item → edit price → toast "সেভ হলো" / value persists on refetch.
3. Log in with the same number from the **গ্রাহক** tab → should land and stay on `/customer/dashboard`.
4. A pure-consumer account (no shop) opening `/app/...` directly → still redirected to `/customer/dashboard` (existing protection preserved).
