## Goal
Add a privacy toggle in the topbar so the user can hide all monetary/stock digits on the **Products** and **Stock Report** pages when showing the screen to strangers (customers, visitors). One click hides; one click reveals.

## UX
- New eye icon button in `AppTopbar` (next to Settings).
  - Icon: `Eye` (visible) / `EyeOff` (hidden) from lucide.
  - Tooltip / label: "Cost Hide" (EN) / "মূল্য লুকান" (BN, via i18n).
- When **ON (hidden)**:
  - All cost, price, MRP, profit, totals, and stock-quantity numbers on **Products** (`/app/products`) and **Stock Report** (`/app/stock-report` etc.) render as `••••`.
  - Product names, categories, images, units stay visible.
- When **OFF**, everything renders normally.
- State persists in `localStorage` so it survives reloads, and syncs across tabs.

## Scope
Pages affected by the mask:
1. `src/pages/app/Products.tsx` — cost, sale price, MRP, stock qty, profit columns/cells.
2. `src/pages/app/StockReport.tsx` — stock value, qty, cost columns.

All other pages (POS, Purchase, Reports, Dashboard) are **unchanged**.

## Technical Details

1. **New hook + provider** `src/lib/costHide.tsx`
   - `CostHideProvider` wraps the app (mount inside `AppLayout`).
   - Exposes `useCostHide()` → `{ hidden: boolean, toggle: () => void }`.
   - Persists to `localStorage` key `cost-hide` and listens to the `storage` event.
   - Helper `maskNumber(value, hidden, fallback = "••••")` for convenience.

2. **Topbar button** in `src/components/app/AppTopbar.tsx`
   - Insert a small icon button before the Settings button.
   - Uses `useCostHide()`; shows `Eye` when revealed, `EyeOff` when hidden.
   - Adds `costHide` / `costShow` strings to `src/lib/i18n.tsx` (EN + BN).

3. **Products page** (`src/pages/app/Products.tsx`)
   - Read `hidden` from `useCostHide()`.
   - Wrap every rendered cost / price / MRP / profit / stock-qty number with `hidden ? "••••" : <existing render>`.
   - Keep currency symbol next to the mask (e.g. `৳ ••••`) for layout stability.

4. **Stock Report page** (`src/pages/app/StockReport.tsx`)
   - Same treatment for qty, unit cost, total value, and summary tiles.

5. **No backend / migration / schema changes.** Pure client-side UI preference.

## Out of Scope
- Masking on POS, Purchase, Dashboard, Reports, Cashbook, etc. (can be a follow-up).
- PIN-protecting the toggle. It is a quick visual hide, not access control.

## Acceptance
- Toggling the topbar eye icon instantly masks/unmasks all numeric values on the Products and Stock Report pages.
- Preference survives page reload and tab switches.
- No other page's display changes.
