## Goal

On the Products & Stock page, add a prominent summary card at the top (visible on both mobile and desktop) showing **Total Stock** and **Stock Value**, and improve the **Stock History** popup so the user can pick which products' history to view — matching the two sample screenshots.

## Changes

### 1. Top summary card (mobile + desktop)
File: `src/pages/app/Products.tsx`

Add a blue gradient card right under the page title, before the toolbar:

```text
┌───────────────────────────────────────────────┐
│  ┌──────────────┐    ┌──────────────┐         │
│  │     128      │    │   39,040 ৳   │         │
│  │ Total Stock  │    │ Stock Value  │         │
│  └──────────────┘    └──────────────┘         │
└───────────────────────────────────────────────┘
```

- Two stat tiles inside one rounded card with a brand-blue (primary) background.
- Numbers come from existing computed values:
  - **Total Stock** = sum of `stock` across `filtered` (skip unlimited / negative).
  - **Stock Value** = existing `totalStockValue` (already computed).
- Bilingual labels (bn: "মোট স্টক" / "মজুদ মূল্য").
- Numbers use `bnNum` when `lang === "bn"`, money via `fmtMoney`.
- Responsive: `grid-cols-2` always; tighter padding on mobile (`p-3 sm:p-5`), larger numbers on desktop.
- Remove the duplicate "Total stock value" row that currently sits at the bottom of the table footer (now redundant), keep "Total Products" header inside the table card.

### 2. Surface "Stock History" on mobile
The button exists in the header action row but wraps off-screen on small viewports. Make sure it stays accessible:

- Keep the existing **Stock History** button in the desktop header.
- Add a compact secondary action row (icon + label) right below the summary card on mobile (`sm:hidden`) with **Stock History** and **Stock Edit** buttons so they are reachable on phones.

### 3. Stock History popup with product multi-select
Replace the current always-show-all `Dialog` body with a two-step UX:

**Step A — Product picker (default view when opening the dialog):**
- Search box at top.
- Scrollable checklist of all products (name + current stock).
- "Select all" toggle.
- Footer: `Cancel` | `Show history (N selected)` button (disabled when none selected).

**Step B — History view (after pressing Show history):**
- Header shows chosen product chips with a small `Change` link to go back to Step A.
- Existing history table (Date / Product / Type / Qty), filtered to `selected` product ids only.
- "Back" button returns to Step A; closing the dialog resets selection.

Data source: existing `stockHistoryQuery(current?.id)` already returns all movements; we just filter client-side by `selected` ids. No new query needed.

### 4. Small polish
- Stock History button: keep `History` icon, make it the brand-outlined style shown in the sample (blue border + blue text) on the page header.
- Card colors use existing CSS vars (`bg-primary text-primary-foreground`) so it follows the user's theme.

## Files touched
- `src/pages/app/Products.tsx` — summary card, mobile action row, revamped history dialog (two-step), remove redundant footer total.

No new dependencies, no DB / schema / migration changes.
