## Plan

1. Add a safe due-discount backend flow
- Create a small adjustment-history table for sale due changes so discount is recorded instead of silently editing balances.
- Store: shop, sale, customer, amount, type=`discount`, note, created_by, created_at.
- Keep RLS aligned with existing shop-member rules.
- When a discount is applied, update these 3 places together:
  - `sales.discount` increases
  - `sales.total` and `sales.due` decrease
  - `customers.due_balance` decreases

2. Add “Discount” action where due exists
- Update `src/pages/app/SalesLedger.tsx` so rows with `due > 0` get a new action in the 3-dot menu.
- Build a reusable dialog/component for due discount:
  - shows current due
  - lets user enter discount amount and optional note
  - validates discount cannot exceed current due
  - shows remaining due before save
- Refresh invoice/query state after save so the row updates immediately.

3. Add the same discount support in the Fordo flow
- Extend `src/components/app/ConvertWishlistToSaleDialog.tsx` so if the converted sale will have due, the modal also allows a discount before final save.
- Recalculate preview inside the modal:
  - item total
  - paid
  - discount
  - final due
- Keep `customer_wishlists.converted_sale_id` linked so the sale remains traceable.
- Update invoice/receipt data so the discount appears correctly after conversion.

4. Make first page loads and first navigation feel much faster
- Reduce eager work in the app shell:
  - lazy-load `QuickSellSheet` and `SettingsSheet` from `AppTopbar`
  - defer notification fetch/realtime setup until needed, or at least filter it tightly by `user_id`
- Add route preloading for the most-used app pages (`/app/sell`, `/app/purchase`, `/app/dashboard`, ledgers) so first click does not wait for chunk download.
- Keep the shell light while route chunks load by preserving the existing skeleton and warming common routes after idle.
- Review heavy first-load queries in the shell (`my_account`, shops, perms, notifications`) and avoid unnecessary duplicate work.

5. QA pass
- Verify these cases:
  - sale with due → apply discount from ledger
  - discount larger than due is blocked
  - customer due balance updates correctly
  - converted Fordo sale with due + discount saves correctly
  - invoice shows updated discount and due
  - first open of Sell/Purchase/Ledger pages is noticeably faster than now

## Technical details
- Likely files:
  - `src/pages/app/SalesLedger.tsx`
  - `src/components/app/ConvertWishlistToSaleDialog.tsx`
  - `src/components/app/InvoiceDialog.tsx`
  - `src/components/app/AppTopbar.tsx`
  - `src/pages/app/AppLayout.tsx`
  - `src/routes.tsx` and/or shared navigation components for route warming
  - new migration for due-adjustment history
- Performance note: part of the slowness is from the current preview/dev environment loading many JS chunks on first visit. That cannot become literally zero, but the app can still be made much more responsive by preloading common routes and removing unnecessary shell work.