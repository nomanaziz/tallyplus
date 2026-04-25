## Goal

Make `/admin/marketplace` admin-friendly for laptop work: wide layout, category grouping, pagination, fast filtering, and bulk actions. Same treatment for the Listings tab.

## Layout changes (Products tab)

- Switch container from `max-w-6xl` centered cards to a full-width admin layout (`max-w-[1600px]`, dense padding) — uses available laptop width.
- Replace the 2–3 column card grid with a **dense data table** (one product per row):
  - Columns: image (40px), Bangla name + English name, Brand, Pack size, Category, Shop types (chips, max 3 + "+N"), Default price, Default cost, Active toggle, Edit button.
  - Sortable headers: name, category, price, created date.
  - Sticky header, zebra rows, row hover highlight.
- Top toolbar (sticky): search box, **Category filter** dropdown, **Shop type filter** dropdown, Active/Inactive filter, "+ New Product" button, "Bulk actions" menu.

## Category grouping

- Add a left sidebar (collapsible on narrow widths) listing all distinct categories from `marketplace_products.category` with the product count next to each (e.g. `Beverages (24)`).
- Selecting a category filters the table to that category. "All categories" resets.
- Add a category header chip above the table when filtered, with an "x" to clear.
- In the editor dialog, change the Category field from a free-text `Input` to a **Combobox** that suggests existing categories (with "Create new" option) so admins reuse the same names instead of typos creating duplicate buckets.

## Pagination

- Server-side pagination using Supabase `.range()` + `count: "exact"`:
  - Page size selector: 25 / 50 / 100 (default 50).
  - Pager: First / Prev / page numbers / Next / Last + "Showing 51–100 of 842".
- Search, category filter, shop type filter, and active filter all run server-side (`.ilike`, `.eq`, `.contains`) so pagination stays accurate across the whole dataset.
- Debounce search input (300ms).

## Bulk actions

- Row checkboxes + "select all on page" header checkbox.
- Bulk menu: Activate, Deactivate, Assign category, Assign shop types, Delete (with confirm).

## Listings tab

- Same wide table treatment with pagination (default 50/page).
- Columns: product (Bangla name), shop name, price, stock, min order, unit, published toggle, created date.
- Filters: search by product/shop name, published/hidden, shop type.
- Add a "Group by product" view toggle that collapses listings under each canonical product so admins can audit how many shops sell each item.

## Editor dialog improvements

- Keep current fields; widen dialog to `max-w-3xl`.
- Category becomes Combobox (existing values + create new).
- Shop type chips grouped in two rows for readability.
- Show a small "Used in N listings" count next to the title when editing an existing product.

## Technical notes

- All data fetching moves into TanStack Query (`useQuery`) keyed by `[filters, page, pageSize]` so navigation/filter changes are cached and snappy. (TanStack Query already required by router context per project conventions.)
- Use `supabase.from("marketplace_products").select("*", { count: "exact" }).range(from, to)` with `.ilike("name_bn"|"name_en", `%q%`)`, `.eq("category", cat)`, `.contains("shop_types", [code])`, `.eq("is_active", flag)` chained based on active filters.
- Distinct category list fetched via a lightweight grouped query: `select("category").not("category", "is", null)` then dedupe client-side (cheap; used only for the sidebar).
- Bulk update uses `supabase.from("marketplace_products").update({...}).in("id", selectedIds)`.
- Debounce via a small `useDebouncedValue` hook in the same file.
- No DB schema changes required.

## Out of scope

- No changes to the public marketplace experience.
- No changes to `marketplace_products` schema.
- Mobile layout for admin stays functional but is not the design target (per user — admin is laptop-first).
