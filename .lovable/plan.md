## Problem

1. **Service sell option missing for some sellers** — Services menu item in `AppSidebar` (and the Dashboard menu grid that mirrors it) is gated by `perm: "products"`. Shop owners always see it, but **staff/member accounts without the `products` permission group do not**, and there's no Service-specific permission. Some users simply don't realize Services exists because it sits inside the sidebar group.

2. **No product limit enforcement for free plan** — `usage_limits` table has `products: 10` for free plan, but the Products page only *displays* usage on `/app/usage-limits`. Inserts are not blocked. Same for services (no row exists at all).

## Plan

### 1. Make Services always discoverable

- In `src/components/app/AppSidebar.tsx`, change the Services entry's `perm` from `"products"` to a new `"services"` group so it can be granted independently (and add a `services` group to permission presets so owners/managers get it by default).
- Add a `services` group to `src/lib/permissions.ts` presets (owner: full, manager: full, staff: read+create, cashier: read).
- Add a "Services" tile to the Dashboard quick-actions section (new card with `Wrench` icon → `/app/services`) so even members without sidebar access discover it from home.
- Add a small "Add Service" demo card in the empty-state of `Products` page linking to `/app/services` with one-line copy: "সার্ভিস বিক্রি করতে চান? এখানে যোগ করুন".

### 2. Free-plan limits with hard enforcement

**Database (migration):**
- Add `services` row to `usage_limits` for each plan: `free=5`, `monthly/yearly/lifetime=-1` (unlimited).
- Create SQL function `public.check_usage_limit(_shop_id uuid, _feature text)` returning `{ allowed boolean, used int, limit int, plan_code text }`. It looks up the owner's active plan (falls back to `free`), reads `usage_limits.limit_count`, and counts current rows in the relevant table (`products`, `services`, `sales`, `purchases`, `expenses`, `customers`, `suppliers`).
- Add `BEFORE INSERT` triggers on `products` and `services` (`tg_enforce_free_limit_products`, `tg_enforce_free_limit_services`) that call `check_usage_limit` and `RAISE EXCEPTION 'limit_reached: <feature>:<limit>'` when exceeded. Triggers no-op for paid plans (limit = -1).

**Frontend:**
- `src/lib/usage-limits.ts` (new) — small helper `useUsageLimit(feature)` hook wrapping the `check_usage_limit` RPC, returning `{ allowed, used, limit, planCode }`.
- In `Products.tsx` and `Services.tsx`:
  - Show a banner above the list when on free plan and used ≥ 80% of limit: "ফ্রি প্ল্যানে X/Y — আনলিমিটেড পেতে আপগ্রেড করুন" with `Link to="/app/subscribe"`.
  - Disable the "Add" button when `used >= limit` and show toast "সীমা শেষ — আপগ্রেড করুন" linking to subscribe.
  - On insert error, parse `limit_reached:` message and show the same upgrade toast (defense in depth).
- Update `UsageLimits.tsx` `FEATURES` array to include `services` row.

### 3. Demo seed (optional, requested "demo add করে দাও")

Insert a sample service per shop that has zero services on first visit to `/app/services` — handled in the page (not a migration) so it's per-shop and only when empty: shows "ডেমো সার্ভিস যোগ করুন" button that inserts one example row (e.g. "ফ্রি ডেলিভারি সার্ভিস", price 100, duration 30 min) so owners immediately see what a service looks like.

## Technical Details

**Files to edit**
- `supabase/migrations/<new>.sql` — usage_limits seed for `services`, `check_usage_limit` function, two BEFORE INSERT triggers, `services` perm key allowed in `shop_custom_roles`/preset.
- `src/lib/permissions.ts` — add `services` group to presets.
- `src/components/app/AppSidebar.tsx` — change Services `perm` to `"services"`.
- `src/pages/app/Dashboard.tsx` — auto-picks up new perm; add Services quick-tile to the top action grid.
- `src/lib/usage-limits.ts` — new hook + RPC wrapper.
- `src/pages/app/Products.tsx` — add limit banner + disable Add when full.
- `src/pages/app/Services.tsx` — same banner/disable + "Add demo service" button when empty.
- `src/pages/app/UsageLimits.tsx` — add `services` to FEATURES list.

**Limits proposed for free plan** (matching existing tone):
- products: 10 (already set)
- services: 5 (new)
- All paid plans: unlimited (-1)

No edge-function changes required.