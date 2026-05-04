# Fix dashboard shop setup screen

Three concrete issues to address.

## 1. New shop types are not in the database

The previous migration adding `service_provider`, `salon_beauty`, `repair_shop`, and `others` never actually ran — the DB still shows only the original 12 shop types (verified via `SELECT * FROM shop_types`). That is why the dropdown still does not include any service/others option.

**Fix:** create a fresh migration with a new timestamp that re-runs the same `INSERT … ON CONFLICT DO UPDATE` for the four new shop types. After it runs, `ShopTypePicker` will pick them up automatically (it loads from the DB, no code change needed).

## 2. The setup card on `/app/dashboard` is too minimal

Currently when a user has 0 shops, `AppLayout.tsx` renders a tiny inline card with only **Shop name + Shop type + Create button** — no logo, address, area, phone, or "sell online" toggle. The full `AddShopDialog` already collects all of those fields and is what `/app/shops` uses.

**Fix:** replace the inline card in `AppLayout.tsx` with the same `AddShopDialog` (kept open by default when the user has zero shops). Same UX as adding a second shop, so the first-time onboarding finally captures address, division/district/area, phone, logo, and "sell online" — matching the requirement that pharmacies need an address and service-providers need their service area.

## 3. Existing shop owner still sees the setup page after refresh

`AppLayout` decides "show setup" purely on `shops.length === 0` from the `my_account_resolve` RPC. If that call returns an empty array transiently (network blip, RLS edge case, or `auth.uid()` mismatch right after token refresh), an owner who already has a shop is dumped on the setup screen. The user has reported this twice now.

**Fix:**
- After the RPC returns, if `owns_shop === true` but `shops` array is empty, do a direct fallback query: `from('shops').select(...).eq('owner_id', user.id).is('deleted_at', null)` and use that result. This guards against the RPC inconsistency.
- If `owns_shop === true` and we still resolve to zero shops, do **not** render the setup card — render the spinner and re-trigger `refresh()` once. Better to wait a beat than wrongly prompt an owner to "set up" a new shop.
- Add a small console warning in that branch so we can spot it in logs going forward.

## Technical notes

- New migration file: `supabase/migrations/<new-ts>_reapply_service_shop_types.sql` (same body as `20260504052000_add_service_shop_types.sql`).
- `src/pages/app/AppLayout.tsx`:
  - Remove the inline setup `<div>` (lines ~227–255) and the now-unused `shopName`, `shopTypeCode`, `creating`, `createShop`, `ShopTypePicker` import.
  - When `shops.length === 0` and not in the fallback-loading state, render `<AddShopDialog open onOpenChange={() => {}} />` with an empty backdrop screen behind it.
- Add fallback query + retry inside the `my_account_resolve` effect in `AppLayoutWithShop`.

No DB schema change beyond the re-applied seed; no other components touched.
