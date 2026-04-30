## Goal
Make `/app/products` mobile-friendly so the product list shows higher on the screen. Reduce the height of the top header block (title + actions + summary card + duplicate quick actions + toolbar) significantly on mobile (≤640px), while keeping desktop layout mostly the same.

## Changes (only `src/pages/app/Products.tsx`)

### 1. Title row — keep compact on mobile
- Remove the redundant breadcrumb text "Products & Stock Management" on mobile (`hidden sm:block`).
- Make the H1 smaller on mobile: `text-base font-bold sm:text-xl md:text-2xl`.
- Tighten container padding: `px-3 py-2 sm:px-4 sm:py-4`.

### 2. Action buttons — collapse into "More" menu on mobile
Currently 6 buttons (Stock history, Stock edit, Select, Download/Print, Import Sample, Add Product) wrap into 3 rows on mobile.

New behavior:
- **Mobile (`sm:hidden`)**: show only the primary **+ Add Product** button (icon + short label) and a **kebab "More" dropdown** containing: Select, Download/Print, Import Sample. Stock history & Stock edit are already duplicated below as the mobile quick-action row, so they don't need to appear in the top action row on mobile — hide them with `hidden sm:inline-flex`.
- **Desktop (`hidden sm:flex`)**: keep current full button row unchanged.
- Buttons inside the mobile More dropdown reuse the same handlers (`handlePrintProducts`, `setOpenImport`, `setSelectMode`).

### 3. Summary card (Total Stock / Stock Value) — slim down
- Reduce padding: `p-2 sm:p-5`, inner tiles `py-2 sm:py-4`.
- Reduce number size on mobile: `text-base sm:text-3xl`.
- Reduce label size: `text-[10px] sm:text-sm`, drop `mt-1` to `mt-0.5` on mobile.
- Net effect: card height roughly halves on mobile.

### 4. Mobile quick-action row (Stock History + Stock Edit)
- Reduce button height from `h-10` to `h-9` and tighten gap to `gap-1.5`.
- Reduce top margin `mt-3` → `mt-2`.

### 5. Filter / Search / Sort / Refresh — compact toolbar on mobile
Currently `DataToolbar` produces 3 visual rows on mobile (search+barcode, sort+filter, refresh).

New mobile layout (still uses `DataToolbar` so we keep the shared component, but wrap selects so they sit on one compact row):
- Wrap the two `Select` triggers with `className="h-9 w-full sm:w-[170px] text-xs sm:text-sm"` so they shrink and share a single row.
- Pass a custom `middleExtra` wrapper `<div className="flex w-full gap-1.5 sm:contents">` so on mobile the two selects sit on a single second row, and on desktop they remain inline as today (`sm:contents` flattens the wrapper).
- Reduce search input + barcode height by overriding via container (already h-10 in DataToolbar — we keep, but reduce wrapping margin `mt-4` → `mt-2`).
- Refresh button: on mobile, change the rendered label to icon-only by passing a custom `rightExtra` and not relying on DataToolbar's built-in Refresh — pass `onRefresh={undefined}` and instead render a compact icon-only refresh button in `rightExtra` with `className="h-9 w-9 sm:h-10 sm:w-auto sm:px-3"` showing label only on `sm:`.

(If overriding DataToolbar internals proves awkward, alternative: wrap DataToolbar in a `<div className="[&_button]:h-9 sm:[&_button]:h-10 [&_input]:h-9 sm:[&_input]:h-10">` to force compact heights on mobile without editing the shared component.)

### 6. Margins between blocks
- Summary card: `mt-2 sm:mt-4`
- Toolbar wrapper: `mt-2 sm:mt-4`
- "Total Products: N" header inside table card: `px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm`.

## Out of scope
- No changes to the table rows themselves.
- No changes to `DataToolbar.tsx` shared component (keep changes local to Products page via wrapper class overrides).
- No changes to other pages.

## Files touched
- `src/pages/app/Products.tsx` only.

## Expected result on 390px viewport
- Header block (everything above the product list) reduces from ~480px to ~230px.
- Filter / search / sort / refresh occupy 2 compact rows instead of 3 tall ones.
- Action buttons occupy 1 row on mobile (Add Product + kebab) instead of 3.
- Product list becomes visible without scrolling on most phones.
