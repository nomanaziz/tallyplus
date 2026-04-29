## Goal

Two things in one round:

1. **Unify every action button across the whole app** — same size, same look, same icon spacing — so Products, Returns, Sales, Purchase, Contacts, Reports etc. all look like one system.
2. **Add a real Serial / IMEI capture flow** for electronics & mobile shops, with three modes (Range / Manual / None) right when stock is added — not as an after-thought.

---

## Part 1 — Unified Action Button System

### The standard (one rule for the whole app)

| Button role | Variant | Size | Icon |
|---|---|---|---|
| Primary action (Save / Add new / Submit) | `default` | `h-10 px-4` | left, 16px |
| Secondary (Print / Download / Import / History / Filter toggle) | `outline` | `h-10 px-4` | left, 16px |
| Destructive (Delete / Bulk delete) | `destructive` | `h-10 px-4` | left, 16px |
| Cancel (in toolbar / dialog footer) | `outline` | `h-10 px-4` | left, 16px |
| Row icon-only (Eye / Edit / Trash inside a table row) | `ghost` | `h-8 w-8` icon | center, 16px |
| Dialog footer pair | `outline` + `default`, both `h-10`, equal width on mobile | | |

All of them use the existing `<Button>` component with `className="h-10 gap-2"` (or `h-8 w-8` for row icons). No more `size="sm"` toolbars on Returns while Products uses `h-10`.

### What gets fixed

Pages I will sweep and normalize (the pattern is identical, so this is mechanical):

- `src/pages/app/Returns.tsx` — currently `size="sm"`, switch toolbar to `h-10` outline + primary (matches Products).
- `src/pages/app/returns/Id.tsx` — back/print buttons → `h-10` outline (not `size="sm"`).
- `src/pages/app/returns/New.tsx` — Save/Cancel footer pair → standard pair; remove the hand-rolled `bg-foreground text-background` color override (use plain `default`).
- `src/pages/app/Sell.tsx`, `src/pages/app/Purchase.tsx`, `src/pages/app/PurchaseLedger.tsx`, `src/pages/app/SalesLedger.tsx`, `src/pages/app/DueLedger.tsx`, `src/pages/app/DueHistory.tsx`, `src/pages/app/ExpenseLedger.tsx`, `src/pages/app/Cashbox.tsx`, `src/pages/app/Contacts.tsx`, `src/pages/app/Assets.tsx`, `src/pages/app/Reports.tsx`, `src/pages/app/Expiring.tsx`, `src/pages/app/Warranty.tsx`, `src/pages/app/CustomerWishlist.tsx`, `src/pages/app/FordoHistory.tsx`, `src/pages/app/RecycleBin.tsx`, `src/pages/app/Marketing.tsx`, `src/pages/app/OnlineShop.tsx` and its sub-pages — apply same toolbar pattern (`h-10 gap-2`, correct variant, icon left).
- All dialog/sheet footers (Save / Cancel pair) get `flex gap-2`, both buttons `h-10`, equal width on mobile (`flex-1 sm:flex-none`).
- Row icon buttons everywhere → `variant="ghost" size="icon" className="h-8 w-8"` (Returns list already correct, others get matched).

I will **not** rewrite logic — only swap variant / size / className on `<Button>` usages.

### Optional polish

Add two semantic class helpers in `src/lib/utils.ts`:

```ts
export const btnToolbar = "h-10 gap-2";     // toolbar action
export const btnRowIcon = "h-8 w-8";         // row-level icon button
```

So future pages stay consistent without thinking.

---

## Part 2 — Smart Serial / IMEI System

### What already exists

- `products.is_serialized` boolean column ✓
- `product_serials` table (id, shop_id, product_id, serial_no, imei2, status, cost_price, warranty_until) ✓
- `ProductSerialsDialog` (manual bulk paste — works) ✓
- `SerialPickDialog` (pick at sell time) ✓
- Toggle "Serialized product (IMEI/Serial)" on Add Product form (only shown for mobile / electronics shops) ✓

What's **missing**: when the shopkeeper adds new stock (purchase / update stock), there is no smart way to enter the new serials. Today they have to open "Manage Serials" separately and paste them. We will fix that.

### New concept: Serial Capture Modes

When `is_serialized = true` and the user adds stock (qty N), a new step appears: **"Serial / IMEI কীভাবে যোগ করবেন?"** with three modes:

**Mode 1 — Range / Sequential** (perfect for "10 pcs, IMEIs differ only at the end")
- Inputs: **Prefix** (locked common part, e.g. `35489710987654`) + **Start number** (e.g. `1`) + **Pad length** (auto-detected)
- Live preview of all N serials before save: `354897109876541`, `…42`, `…43` …
- One-click **Generate** → all N serials inserted in one call.

**Mode 2 — Manual / Random** (each unit has its own serial)
- Shows N input rows (one per unit being added).
- Supports paste-from-clipboard: paste a list with newlines/commas → auto-fills all rows.
- Each row validated for duplicates against existing serials in this shop.

**Mode 3 — Skip for now**
- Stock count goes up, but no serials are created. The user can fill them later from "Manage Serials". Useful for the case "I'll do it tonight".

### The 50-at-a-time safeguard (your concern about 1000-row hangs)

- Hard cap **N ≤ 50 per single capture**. If qty > 50, the dialog splits into pages: "Batch 1 of 4 (1–50)", "Batch 2 of 4 (51–100)" etc.
- Each batch saves independently (single `insert` of up to 50 rows), so no big payload, no UI freeze.
- Range mode has no cap — generating 1000 sequential IMEIs is cheap (it's just math + one bulk insert chunked at 200/call).
- Inputs are virtualized in Manual mode for batches — only the current 50 render.

### Where it plugs in

Two entry points, both already exist — we just inject the Serial Capture step:

1. **Add Product form** (`Products.tsx` `ProductForm`): when serialized toggle is ON and initial `stock > 0`, after Save show `<SerialCaptureDialog qty={stock} mode-picker />`.
2. **Update Stock dialog** (`UpdateStockDialog.tsx`): when adding stock (positive delta) on a serialized product, after save show the same dialog with `qty=delta`. When reducing stock on a serialized product, show `SerialPickDialog` (already exists) so the user marks which specific serials left.
3. **Purchase flow** (`Purchase.tsx`): same — after each line of a serialized product is saved, queue a SerialCaptureDialog.

### New component

`src/components/app/SerialCaptureDialog.tsx` — single dialog with the 3-tab mode picker, batch pagination, validation, bulk insert into `product_serials`.

### Database

Schema is already in place. No new tables. Just use `product_serials` with `status='in_stock'` for newly captured units.

We will add **one supporting index** for fast duplicate-check:
```
CREATE INDEX IF NOT EXISTS idx_ps_shop_serial ON product_serials (shop_id, serial_no);
```
(table already has UNIQUE (shop_id, serial_no), so this just makes the lookup explicit.)

### UX detail

- Range mode auto-detects the prefix from a single sample IMEI: paste `354897109876541`, set qty=10, set "last 2 digits change" → prefix = `3548971098765`, start=`41`, pad=`2`, preview shows 10 serials.
- All serials get the same `cost_price` (taken from purchase line if from purchase, else from product cost), and `warranty_until` (auto-computed from product's warranty setting + today).
- After capture, a green confirmation: "X serial saved ✓" + link "Manage Serials" to view/edit.

---

## Files touched

**Part 1 (button standardization):** `src/pages/app/Returns.tsx`, `src/pages/app/returns/Id.tsx`, `src/pages/app/returns/New.tsx`, `src/pages/app/Sell.tsx`, `src/pages/app/Purchase.tsx`, `src/pages/app/PurchaseLedger.tsx`, `src/pages/app/SalesLedger.tsx`, `src/pages/app/DueLedger.tsx`, `src/pages/app/DueHistory.tsx`, `src/pages/app/ExpenseLedger.tsx`, `src/pages/app/Cashbox.tsx`, `src/pages/app/Contacts.tsx`, `src/pages/app/Assets.tsx`, `src/pages/app/Reports.tsx`, `src/pages/app/Expiring.tsx`, `src/pages/app/Warranty.tsx`, `src/pages/app/CustomerWishlist.tsx`, `src/pages/app/FordoHistory.tsx`, `src/pages/app/RecycleBin.tsx`, `src/pages/app/Marketing.tsx`, `src/pages/app/OnlineShop.tsx`, `src/lib/utils.ts`.

**Part 2 (serial capture):** new `src/components/app/SerialCaptureDialog.tsx`; edits to `src/pages/app/Products.tsx`, `src/components/app/UpdateStockDialog.tsx`, `src/pages/app/Purchase.tsx`; one tiny migration for the supporting index.

---

Approve and I'll implement both parts in one pass.