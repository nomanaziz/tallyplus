## Combined Report — Improvements & Multi-Shop Limit

### 1. Add Shop Limit (per subscription plan)

**Database**
- Add column `max_shops INTEGER NOT NULL DEFAULT 1` to `subscription_plans`.
- Backfill sensible defaults (Free=1, Basic=3, Pro=5, Premium=10) but admin can override anytime.
- Add helper SQL function `public.user_shop_limit(_user_id uuid)` returning the user's current allowed limit (active subscription's `max_shops`, default 1 if none).
- Add helper `public.user_active_shop_count(_user_id uuid)` returning active (non-deleted) shop count.

**Admin UI** (`src/routes/admin.plans.tsx`)
- Add a "Max Shops" numeric input on plan create/edit form.
- Show column in plans table.

**Enforcement (client + server)**
- `AddShopDialog` & `app.shops.tsx`: before opening "Add Shop", fetch current limit & count. If `count >= limit`, disable the "Add new shop" tile and show a tooltip/toast: *"আপনার plan-এ সর্বোচ্চ X টি দোকান allowed। Upgrade করুন।"* with a link to `/app/subscribe`.
- Add server-side guard via a database trigger on `shops` INSERT: raise exception if owner exceeds `user_shop_limit(owner_id)`.

### 2. Improve "Add New Shop" Form (match uploaded mockup)

Redesign `AddShopDialog` to include all fields from the screenshot:
- Logo upload (circular, "Add a logo of your Shop" — uses `shop-logos` bucket)
- Shop Name * (existing)
- Shop Type * (existing, ShopTypePicker)
- Division / District / Area (3 location dropdowns — store in `seller_locations`)
- Address *
- Mobile Number * (with +88 country code prefix)
- "Do you want to sell Online?" — Yes / No radio cards
- Footer: Cancel + Add New Shop buttons

Validation with zod (name, address, phone required; phone = 11 digits BD format).
On submit: insert into `shops` (with logo_url, address, phone), then insert into `seller_locations` (division/district/area), seed default categories. If "Yes" online, set a flag to surface online-shop onboarding next.

### 3. Combined Report Page Polish

- **Mobile responsiveness**: Stack action buttons vertically on small screens; make shop-selector popover full-width; section cards single-column on mobile (already `lg:grid-cols-2`); details report table → horizontal scroll preserved with sticky first column.
- **Remove a button**: User indicated a button to remove on the screenshot but didn't specify which. The plan removes the **Refresh** button (data already refetches when filters change and via TanStack Query cache; explicit refresh is redundant alongside auto-refetch). If you meant a different button (Download/Print, Shops selector, or Back arrow), tell me before I implement and I'll swap.
- Keep tabs (General / Details), date range, shop multi-select, download/print.

### 4. Files Changed

- `supabase/migrations/*` — add `max_shops`, helper functions, INSERT trigger on shops.
- `src/routes/admin.plans.tsx` — max_shops field in form/table.
- `src/components/app/AddShopDialog.tsx` — redesign with full fields + logo upload + location + phone.
- `src/routes/app.shops.tsx` — limit enforcement on "Add new shop" tile.
- `src/routes/app.combined-report.tsx` — mobile layout + remove Refresh button.
- `src/lib/queries.ts` (if needed) — add `userShopLimitQuery`.

### Summary
Builds a proper plan-aware multi-shop limit (admin-controlled per plan, enforced at DB and UI level), revamps the Add-Shop form to match your mockup with logo + address + phone + location + online-sell flag, and polishes the Combined Report with mobile-friendly layout. Pending your confirmation on which button to remove from the report header.
