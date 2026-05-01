## Goal

On the প্রোডাক্ট ও স্টক page (`src/pages/app/Products.tsx`), make stock status visually obvious with color-coded "In stock" cells and add a small online icon next to products that are published to the online shop.

## Color rules (In stock cell)

For each row, compute color from `stock` and `low_stock_alert`:

- **Red** — out of stock: `stock === 0`
- **Yellow (amber)** — at/below low-stock alert: `stock > 0 && low_stock_alert > 0 && stock <= low_stock_alert`
- **Green** — healthy stock: `stock > low_stock_alert` (or `low_stock_alert` is 0/null and `stock > 0`)
- **Primary (unchanged)** — Unlimited (`stock < 0`) keeps current "অসীম" styling

Apply as a colored pill/badge around the number in the existing "বর্তমান মজুদ / In stock" `<TableCell>` (around line 689–693). Use Tailwind tokens already in the codebase:
- red → `bg-rose-100 text-rose-700`
- yellow → `bg-amber-100 text-amber-700`
- green → `bg-emerald-100 text-emerald-700`

Style: small rounded pill `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums` so it works on the 390px mobile viewport without breaking the row width.

## Online indicator

Add a small Globe icon (lucide-react `Globe` or `Wifi`) next to the product name in the first column when the product is published to the marketplace.

Steps:
1. Extend `productsListQuery` in `src/lib/queries.ts` to also select `is_marketplace_published`.
2. Add `is_marketplace_published?: boolean` to the local `Product` type in `Products.tsx`.
3. In the name `<TableCell>` (around line 677–688), render a tiny `Globe` icon (`h-3.5 w-3.5 text-emerald-600`) right after the name with a `title`/`aria-label` "অনলাইনে বিক্রয়যোগ্য / Available online".

## Files to change

- `src/lib/queries.ts` — add `is_marketplace_published` to the products select.
- `src/pages/app/Products.tsx` — extend `Product` type, import `Globe` from lucide-react, add helper `stockTone(p)` returning a tailwind class, render colored pill in stock cell, render online icon next to product name.

No DB migrations, no new components. Existing `is_marketplace_published` column on `products` is already populated by the online-shop publish flow.
