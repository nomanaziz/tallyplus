
## Plan — Fix 4 reported issues

### Issue 1 — Product Return: top action buttons + functional flow

The Returns list page (`src/pages/app/Returns.tsx`) currently only has a "New return" button. Add three top action buttons matching the rest of the app's pattern: **Download / Report / Print**.

- Add `Download` (CSV export of filtered returns), `Report` (re-uses `printTableReport` from `src/lib/print-report.ts` with totals summary), and `Print` (same helper, no totals box) buttons next to "New return".
- Columns for printout: Date, Return No, Customer, Reason, Total, Refund Amount, Status.
- On `src/pages/app/returns/Id.tsx`, replace the placeholder `window.print()` with `printTableReport` so the per-return invoice prints in the standard tabular header format (shop info left, title + dates right).
- Verify `New.tsx` save flow already inserts into `sale_returns` + `sale_return_items` and refunds correctly — keep as is, only confirm the navigation back to `/app/returns` works.

### Issue 2 — Fordo update misleading "please log in again" toast

In `src/pages/app/CustomerWishlist.tsx` (line 320), when `setFulfillment` returns 0 rows the toast says *"Update failed — please log in again"*. This is wrong — the user is logged in; the row simply wasn't returned (often a transient RLS / replication delay or an item from a different shop context).

- Change the message to: BN `"আপডেট করা গেলো না — আবার চেষ্টা করুন"`, EN `"Update failed — please try again"`.
- Add an automatic single retry after 400ms before showing the error toast (covers the common race where `current.shop` just switched).
- Same wording fix for any other `"please log in again"` occurrence found in this file.

### Issue 3 — `new row violates row-level security policy for table "categories"` (also affects "Add Product")

Investigation:
- The `categories` table policies are correct (`is_shop_member(auth.uid(), shop_id)` for ALL).
- `is_shop_member` returns true for shop owners.
- The console error fires from `ensureDefaultCategories` in `src/lib/default-categories.ts` when called immediately after a shop is selected but before `useShop().current.id` matches a shop the auth.uid actually owns (e.g. during the initial shop-context bootstrap, or right after `AddShopDialog` creates a new shop and the trigger hasn't visibly returned yet).
- The Add Product dialog also triggers this on open.

Fix:
1. **Guard `ensureDefaultCategories`**: before inserting, do a one-shot ownership check (`select id from shops where id = shopId and (owner_id = auth.uid() or member exists)`). If not confirmed, skip — never throw, never log noisy warnings.
2. **Make the seeder server-authoritative**: create a Supabase RPC `ensure_default_categories(_shop_id uuid, _names text[])` (`security definer`, `set search_path = public`) that:
   - verifies `is_shop_member(auth.uid(), _shop_id)`,
   - inserts only the missing names (`on conflict (shop_id, name) where parent_id is null do nothing` — also adds the missing unique constraint).
   - Replace the client-side bulk insert with `supabase.rpc('ensure_default_categories', …)`.
3. **`addCategory` (Products.tsx line 842) & sub-category create**: surface a friendlier toast — if the error code is `42501`, show BN `"এই দোকানে ক্যাটাগরি যোগ করার অনুমতি নেই"` / EN `"You don't have permission to add categories in this shop"` instead of the raw Postgres message.
4. **Add Product save**: same friendlier message mapping for `42501` so the user understands why "Add Product" silently failed when they're on a shop they don't own.

### Issue 4 — "Cannot create / Add New Product"

Root cause is the same RLS path as #3: when the active shop in `useShop()` doesn't match a shop the user owns/belongs to, `products` insert is rejected by RLS but the dialog just shows the raw error. After fix #3 the message becomes actionable, plus:

- In `Products.tsx`, before opening the Add-Product dialog, verify `current?.id` is set; if not, show toast BN `"আগে দোকান নির্বাচন করুন"` / EN `"Select a shop first"` and abort.
- After successful save, if no row is returned (RLS silent failure), show the friendly permission message instead of a generic success.

### Database migration (for fix #3)

```sql
-- 1. Ensure uniqueness for top-level category names per shop
create unique index if not exists categories_shop_toplevel_name_uniq
  on public.categories (shop_id, name)
  where parent_id is null;

-- 2. Server-side seeder
create or replace function public.ensure_default_categories(
  _shop_id uuid,
  _names   text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_shop_member(auth.uid(), _shop_id) then
    return; -- silently no-op for non-members
  end if;
  insert into public.categories (shop_id, name, parent_id)
  select _shop_id, n, null from unnest(_names) as n
  on conflict (shop_id, name) where parent_id is null do nothing;
end $$;

grant execute on function public.ensure_default_categories(uuid, text[]) to authenticated;
```

### Files to change

- `src/pages/app/Returns.tsx` — add Download/Report/Print buttons, wire to `printTableReport` + CSV export.
- `src/pages/app/returns/Id.tsx` — replace `window.print()` with `printTableReport`.
- `src/pages/app/CustomerWishlist.tsx` — fix misleading toast + add single retry.
- `src/lib/default-categories.ts` — switch to RPC + ownership pre-check, silent no-op on permission denial.
- `src/pages/app/Products.tsx` — friendly RLS-error mapping in `addCategory` and `save`; guard "Add Product" when no shop selected.
- New migration file as above.

### Out of scope
No design/UX changes elsewhere; existing print layout standard from `printTableReport` is reused as-is.
