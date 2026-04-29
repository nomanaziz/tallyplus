## Goal
Polish the existing IMEI / Serial workflow so it matches the user's described flow:
"যদি serialized হয় → start থেকে end পর্যন্ত sequence; যদি non-serialized (random) হয় → প্রতিটি IMEI আলাদা করে input"; sell-time এ ওই serial দিয়ে sell।

## Current State (already working — keep as-is)
- `product_serials` table with `serial_no`, `imei2`, `status` (in_stock / sold / returned / damaged), `cost_price`, `warranty_until`, `sale_id`, `sale_item_id`.
- `is_serialized` boolean on `products`.
- `SerialCaptureDialog` — opens automatically after creating a serialized product with stock>0 (Range / Manual / Skip tabs).
- `ProductSerialsDialog` — manage serials per product later.
- `SerialPickDialog` — POS auto-prompts to pick specific serials when selling a serialized product; on sale, those serials flip to `sold` and are linked to the sale_item.

## Changes

### 1. Show "Serialized" toggle for ALL shop types (Products.tsx)
Currently `showSerializedOption = shopTypeCode === "mobile" || shopTypeCode === "electronics"`. Remove the gate so any shop (grocery, hardware, jewelry, etc.) can mark a product serialized. Place the toggle in the "Advanced Options" section of the product form labeled:
- BN: "IMEI / সিরিয়াল ট্র্যাকিং" with help text "প্রতিটি ইউনিটের আলাদা IMEI বা সিরিয়াল নম্বর সেভ করুন"
- EN: "IMEI / Serial tracking"

### 2. Redesign Range tab in `SerialCaptureDialog` to Start → End flow
Replace the current 3-field (Prefix + Start + Pad) with a clearer **2-field** input that matches what the user described ("001 থেকে 010"):

```text
┌─────────────────────────────────────────────┐
│ মোড: [● ক্রমিক (Sequential)]  [○ র‍্যান্ডম] │
├─────────────────────────────────────────────┤
│  শুরু IMEI/সিরিয়াল                          │
│  [ 350123456789001       ]                  │
│                                             │
│  শেষ IMEI/সিরিয়াল  (auto from quantity)    │
│  [ 350123456789010       ]                  │
│                                             │
│  ✓ ১০টি সিরিয়াল জেনারেট হবে                 │
│  Preview: ...001, ...002, ...003, ... ...010│
└─────────────────────────────────────────────┘
```

Behavior:
- User types "350123456789001" in Start. The dialog auto-fills End as `350123456789001 + (qty-1)` preserving the same digit length (auto-detects pad from trailing-numeric length of Start).
- User can edit End. If End doesn't match `Start + qty - 1`, show inline warning: "Range mismatch: Stock = 10 but range generates 12 serials."
- Validate Start has a numeric tail. If purely alphabetic, show error and switch to Manual mode.
- Generation: split Start into `prefix + numericTail`. End must share the same prefix (validate). Generate `[prefix + (start_num+i).toString().padStart(tailLen,'0')]` for i in 0..qty-1.

The two **Manual** and **Skip** tabs stay unchanged. Rename **Range** tab → **Sequential** (BN: ক্রমিক), **Manual** → **Random** (BN: র‍্যান্ডম) to match the user's wording ("যদি non-serialized হয় তাহলে random হয়").

### 3. Stock-quantity coupling
Already coupled — `qty` prop = product.stock. Just add a clear summary banner at top of dialog: "এই পণ্যের জন্য ১০টি সিরিয়াল প্রয়োজন।"

### 4. Verification — no changes needed but re-test
- `ProductSerialsDialog` Bulk add (already supports paste).
- POS `SerialPickDialog` — already enforces serial selection on serialized products at sell time.
- On return/recycle flow — out of scope for this turn.

## Files to modify
- `src/pages/app/Products.tsx` — remove `showSerializedOption` gate (always show); update label/help text.
- `src/components/app/SerialCaptureDialog.tsx` — rebuild Range tab as Start+End, rename tabs, add summary banner & validation.

## Files NOT changed
- DB schema — no migration needed.
- `SerialPickDialog`, `ProductSerialsDialog`, POS sell flow — already work as user described.
