## Goals

1. **Bulk product selection + bulk delete** with a typed "delete" confirmation.
2. **Unified tabular print header** on every ledger/list page, matching the uploaded Hybrid Technology mockups (shop info on left, title + Start/End date on right, then a real columnar table — not the receipt-style layout used today).
3. **Due History page** wired up from the "History" button on Due Ledger, with a back button and a print button using the same header format.
4. Wire up the **Products → Download/Print** button (currently a dead button) and other ledger print buttons that aren't yet hooked up.

---

## 1. Bulk select + bulk delete on Products (`src/pages/app/Products.tsx`)

- Add a "Select" toggle button in the toolbar (next to Stock edit / Download/Print). Activating it shows checkboxes in the table.
- Add a header checkbox to select/deselect all rows on the current page (and a "select all filtered" link when some are selected).
- When ≥1 row is selected, show a sticky bulk-action bar at the bottom (or inline near the title) with:
  - Selection count
  - "Delete selected" button (destructive)
  - "Cancel" button
- **Confirmation dialog** (shadcn `Dialog`):
  - Shows the count of products to be deleted.
  - Has a text `Input` where the user must type exactly `delete` (case-insensitive).
  - The Delete button stays disabled until the typed value matches.
  - On confirm: soft-delete all selected products in one Supabase call (`update({ deleted_at }) .in("id", ids)`), invalidate the `products` query, toast success, exit select mode.

## 2. Unified printable report layout (`src/lib/print-report.ts`)

The current `printReport` helper renders a receipt-style key/value list. The user wants a true table layout matching the uploaded screenshots. Add a new helper without breaking existing callers:

- Add `printTableReport(opts)` with shape:
  ```ts
  {
    shopName, shopAddress?, shopPhone?,
    title,                    // e.g. "Due History", "Transaction History"
    startDate, endDate,       // yyyy-mm-dd; supports lang for Bengali numerals
    columns: { key, label, align? }[],
    rows: Record<string, string>[],
    footer?,                  // defaults to "Powered By : Hishabee Business Manager."
    lang?: "bn" | "en",
  }
  ```
- HTML output mirrors the screenshots:
  - Header: shop name (bold), address, phone on the left; title (bold) and `Start Date: …` / `End Date: …` on the right.
  - Thin horizontal rule under the header.
  - Bold uppercase column headers, then data rows with light row dividers.
  - Centered footer line.
  - Auto-`window.print()` on load (same pattern as today).
- Keep the existing `printReport` export untouched so existing report pages keep working; new pages and the rewrites below use `printTableReport`.

## 3. Wire print buttons across pages

Use `printTableReport` from `src/lib/print-report.ts` so every page shares the same header.

| Page | File | Columns |
|------|------|---------|
| Products list (Download/Print) | `src/pages/app/Products.tsx` | #, Name, SKU, Stock, Cost, Sale Price, Stock Value |
| Due Ledger contacts | `src/pages/app/DueLedger.tsx` (small printer icon already exists at line 109) | #, Contact Name, Phone, Type, Amount |
| Due History (new page, see §4) | `src/pages/app/DueHistory.tsx` | #, Entries, Name, Contact, Contact Type, Amount |
| Sales Ledger | `src/pages/app/SalesLedger.tsx` (replace `printAll` which currently calls `window.print()` on the whole DOM) | #, Name, Contact, Items, Amount, Date, Payment Status |
| Purchase Ledger | `src/pages/app/PurchaseLedger.tsx` (same — replace `window.print()`) | #, Supplier, Contact, Items, Amount, Date, Payment Status |
| Quick Order | `src/pages/app/QuickOrder.tsx` (replace `window.print()` if used for list export) | #, Customer, Items, Amount, Date, Status |

Each page passes its current shop (`current.name`, `address`, `phone`), the active date range (or "All" if none), and the filtered rows.

## 4. New Due History page

- **Route**: add `due-history` to `src/routes.tsx` and lazy-import `./pages/app/DueHistory`.
- **Sidebar/Breadcrumb**: not added to the sidebar; this page is reached from the "History" button on Due Ledger and shows a breadcrumb `Due / Due History` matching the uploaded screenshot.
- **Wire the History button**: in `src/pages/app/DueLedger.tsx` (line ~80) add `onClick={() => nav({ to: "/app/due-history" })}` using the shared router hook.
- **Page contents** (`src/pages/app/DueHistory.tsx`):
  - Top bar: back arrow + "Due History" title.
  - Right side: Download/Print button (uses `printTableReport`), Date range picker (default last 30 days), per-page select, Refresh.
  - Table columns matching the screenshot: Contact Name, Phone, Contact Type (customer/supplier/employee), Amount, Status (paid/due), Date & Time.
  - Empty state: `Showing 1 to 0 of 0 Transactions`.
  - Data source: read from `due_transactions` (or whatever table holds due history — confirmed during implementation by querying the schema; falls back to joining `customer_dues` / `supplier_dues` if no single table exists).

## 5. Files to touch

- **New**: `src/pages/app/DueHistory.tsx`
- **Edit**: `src/lib/print-report.ts` (add `printTableReport` helper)
- **Edit**: `src/routes.tsx` (register `/app/due-history`)
- **Edit**: `src/pages/app/Products.tsx` (bulk select, confirm dialog, wire Download/Print)
- **Edit**: `src/pages/app/DueLedger.tsx` (wire History button + small printer icon)
- **Edit**: `src/pages/app/SalesLedger.tsx` (swap `window.print()` → `printTableReport`)
- **Edit**: `src/pages/app/PurchaseLedger.tsx` (same)
- **Edit**: `src/pages/app/QuickOrder.tsx` (same, if its print button targets the list)

## Open implementation note

Before wiring the Due History data source I'll inspect the database to choose the right table (`due_transactions` vs joining `customer_dues`/`supplier_dues`/`employee_dues`). If no transaction-level table exists yet, the page initially renders the contacts' due_balance entries (matching the same column layout) and we can revisit if you want a true ledger of every due movement.