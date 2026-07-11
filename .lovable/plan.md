## Goal
Add **Supplier Return** (purchase return) that works just like the existing customer/sale return, and correctly moves money back into the shop (cash-in) and reduces supplier due.

## New database tables (migration)
Mirror `sale_returns` / `sale_return_items`:

- `purchase_returns`
  - `shop_id`, `purchase_id` (nullable — allow ad‑hoc returns), `supplier_id`, `return_no`, `subtotal`, `refund_cash`, `credit_to_due`, `note`, `created_by`, `created_at`, `deleted_at`
- `purchase_return_items`
  - `return_id`, `product_id` (nullable), `name`, `qty`, `price`, `total`

Grants + RLS same shape as `sale_returns` (shop members can read/write for their shop).

## Cash & due logic (in the create flow)
When a purchase return is saved:
1. Insert `purchase_returns` + `purchase_return_items`.
2. If `refund_cash > 0`: insert a `cash_movements` row with `direction = 'in'`, `source = 'purchase_return'` → money returns to cashbox.
3. If `credit_to_due > 0`: insert a negative `payments` row (or supplier ledger entry) against the supplier so their outstanding due drops.
4. Increase stock: for each item with `product_id`, add qty back to `products.stock` (reverse of purchase).

This is the "account hit" the user asked for — no double-count, cash just comes back once.

## UI
- New page `src/pages/app/returns/NewPurchase.tsx` (clone of `returns/New.tsx`, wired to purchases).
- Purchase Book row action → "Return items" opens the new page pre-filled with that purchase's items.
- Add a "Purchase Returns" tab/section in `Returns.tsx` listing recent purchase returns with view/print/delete.
- Route: `/app/returns/purchase/new` and `/app/returns/purchase/:id`.

## i18n
Add Bangla + English strings: "সাপ্লায়ার রিটার্ন", "ক্রয় ফেরত", "নগদ ফেরত পেয়েছি", "বাকিতে সমন্বয়".

## Out of scope
- No change to existing sale-return flow.
- No edits to reports beyond making the new cash movement visible (it already appears in cash book because `cash_movements` is the source).
