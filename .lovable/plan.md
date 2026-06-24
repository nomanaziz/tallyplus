## Goal
Make the **Purchase** page (`/app/purchase`) behave differently from Sell — let the user edit purchase price per line, add expiry/serial inline, pay via cash or online, optionally skip supplier as "Walking seller / Cash purchase", and respect the topbar Cost-Hide toggle.

## Scope
Only frontend changes inside:
- `src/components/app/POSPage.tsx` (cart card, checkout dialog)
- topbar Cost-Hide masking extended into POS price/total displays

No DB / migration / queries change.

## Changes

### 1. Purchase cart card (different from Sell)
In the cart loop, when `mode === "purchase"` render a dedicated card layout:

- **Product name + unit** (unchanged).
- **Editable Price input** (cost / purchase price). Edits update `it.price` and mark `price_overridden`. Sell mode keeps current non-editable price.
- **Qty stepper** (kept).
- **Line total** (kept, recomputed live).
- **Icon-row** with two small ghost-buttons:
  - `CalendarClock` icon → opens a tiny popover with a `<Input type="date">` to set/clear an **expiry date** for this line (stored on the cart item as `expiry_date`; if product is not flagged perishable, the icon is still shown but greyed-tip).
  - `Hash` icon → only visible when `prod?.is_serialized` — opens the existing serial picker to add/edit serial numbers for this purchase line.
- Discount row stays available but de-emphasised (purchase rarely uses it).

Sell-mode card is untouched.

### 2. Online payment on Purchase checkout
In `CheckoutDialog` (cash kind) add a small **Payment method** segmented control above the amount row:
- Options: `Cash` / `Online`.
- When `Online` is selected, store `payment_method: "online"` in the `purchases` insert and in the matching `cash_movements` row (skip cashbox entry for online, or tag it `method='online'` — keep existing column; just change the literal).
- Default remains `cash`. Sell side already has its own flow; do not change it here (out of scope).

### 3. Walking seller / Cash purchase toggle
Inside `CheckoutDialog` when `mode === "purchase"`, mirror the existing "Walking customer" checkbox:
- Label: `Walking seller / Cash purchase` (EN) / `ক্যাশ ক্রয় / ওয়াকিং সেলার` (BN).
- When checked: hide supplier name / phone inputs, skip supplier upsert, save the purchase with `supplier_id: null` and `supplier_name: "Cash Purchase"` (existing nullable columns).
- When unchecked: current supplier selection flow is unchanged.

### 4. Extend Cost-Hide to POS
Import `useCostHide` in `POSPage.tsx`. When `hidden === true`, replace every visible money digit with `••••`:
- Product grid card price (`৳{price}` → `৳ ••••`).
- Cart line price input, line total, subtotal, discount, delivery, grand total.
- Checkout dialog amount summary.
Inputs remain editable (value kept), only the displayed numbers next to labels are masked; the actual input fields keep working so the owner can still type when needed.

## Out of Scope
- Backend / schema changes (expiry + serial already exist on product/serial tables; we only store expiry_date on the cart item and pass through if columns exist — otherwise it is a UI-only hint for now).
- Sell-mode card redesign.
- New payment gateway integration — "Online" is just a label/flag.

## Acceptance
- Opening `/app/purchase`, the cart shows price-editable cards with expiry + serial icons.
- Checkout shows Cash / Online toggle and a Walking-seller checkbox; saving with each combination writes the correct `payment_method` and supplier fields.
- Toggling the topbar eye icon masks all money digits on the Purchase page too.
- Sell page (`/app/sell`) looks and behaves exactly as before.
