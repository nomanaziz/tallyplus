## Fixes

### 1. Favorite (❤️) button visibility

The heart toggle already exists on the shop detail pages (`/shop/s/$slug` and `/vendor/$username`), but users on the marketplace listing don't see any heart on shop cards, so the empty-state message ("Go to a shop and press ❤️") feels broken.

**Changes:**
- `src/pages/shop/Index.tsx` (vendor grid): add a small heart icon button in the top-right corner of each vendor card. Click toggles `consumer_favourite_shops` (insert/delete) for the current user. Optimistic UI; show login toast if not signed in. Pre-fetch the user's existing favourite shop_ids once and store in a `Set` to render filled state.
- `src/pages/customer/FavoriteShops.tsx` empty-state copy: keep the hint but also add a button "প্রিয় দোকান খুঁজুন" → `/shop`.

### 2. New "online" shop not appearing in marketplace

In `supabase/functions/marketplace-public/index.ts → action: "list-shops"`, after fetching shops with `marketplace_enabled = true`, the code filters out any shop that has zero published listings:

```ts
const filtered = shopRows.filter((s) => (counts[s.id] ?? 0) > 0);
```

A newly created online shop with no products yet is hidden.

**Change:** keep the listing count but **don't drop** shops with zero listings. Return all `marketplace_enabled` shops; show count badge `0 পণ্য` on the card. Re-deploy edge function (auto).

### 3. Role-based home redirect (admin → wrong dashboard)

`src/lib/home-redirect.ts` only checks `isOwner`, so an **admin who doesn't own a shop** lands on `/customer/dashboard`.

**Change:**
- Update `homePathFor({ loggedIn, isOwner, isAdmin, isConsumer })`:
  - `isAdmin` → `/admin`
  - `isOwner` → `/app/dashboard`
  - else → `/customer/dashboard`
- Update `src/pages/Index.tsx` to pass `isAdmin` (already in `useAuth`).

### 4. Customer "My Orders" empty even though order exists

RLS for `marketplace_orders` requires `consumer_user_id = auth.uid()`. When the customer placed the order through `marketplace-public/place-order`, `consumer_user_id` is only set if a Bearer token was forwarded. Orders placed before login (or from the public site without an attached session) have `consumer_user_id = NULL`, so they never show up.

**Changes:**
- DB migration: add an RLS SELECT policy on `marketplace_orders` allowing the signed-in user to read rows where `customer_phone` matches their `auth.users.phone` OR `profiles.phone` / `consumer_profiles.phone`. Use a `security definer` helper `public.user_phones(uid uuid) returns text[]` that aggregates phone numbers for the user, then policy `customer_phone = ANY(public.user_phones(auth.uid()))`.
- Update `src/pages/customer/MyOrders.tsx` query: keep `consumer_user_id = auth.uid()` filter but also OR by phone. Switch to `.or("consumer_user_id.eq." + uid + ",customer_phone.in.(...phones)")` after fetching the user's phone list (1 small RPC `my_phones()` returning `text[]`).
- Backfill: one-time UPDATE setting `consumer_user_id` for existing orders where `customer_phone` matches a known user phone (run inside the migration).

### 5. Customer dashboard label

`src/pages/customer/Dashboard.tsx` shortcut still says "ঠিকানা" with `MapPin` for the profile link.

**Change:** label → "প্রোফাইল", icon → `User`, target → `/customer/profile` (already correct).

### 6. Bonus: refresh after order

Add `staleTime: 0` and `refetchOnMount: 'always'` (or just remove caching) to MyOrders query so a fresh order shows immediately when the customer navigates back.

## Technical notes

- All RLS changes go through one migration.
- `marketplace-public` edge function only changes the `list-shops` filter line; redeploy is automatic.
- No new packages needed.
- Files touched:
  - `src/lib/home-redirect.ts`
  - `src/pages/Index.tsx`
  - `src/pages/shop/Index.tsx` (heart on vendor card)
  - `src/pages/customer/Dashboard.tsx` (label)
  - `src/pages/customer/MyOrders.tsx` (phone match + refetch)
  - `src/pages/customer/FavoriteShops.tsx` (CTA polish)
  - `supabase/functions/marketplace-public/index.ts` (filter)
  - new migration: phone-based RLS for `marketplace_orders` + `my_phones` RPC + backfill `consumer_user_id`.
