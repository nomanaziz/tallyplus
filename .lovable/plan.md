## Default unit to "piece" / "পিস" everywhere

**Problem:** When a product has no unit, the invoice prints `-` in the Unit column and the line summary skips the unit. User wants `piece` (English) / `পিস` (Bangla) as the default fallback.

**Changes:**

1. **`src/lib/print-invoice.ts`**
   - Line 44 (printed invoice table): replace `item.unit || "-"` with `item.unit || (lang === "bn" ? "পিস" : "piece")`.
   - Line 222 (POS/thermal layout): always include unit — fall back to the same default instead of the current `item.unit ? ... : ""` skip.

2. **`src/components/app/InvoiceDialog.tsx`**
   - Line 144 (on-screen invoice table): replace `it.unit || "-"` with the same language-aware default.
   - Line 263 (POS preview line): same fallback as print POS.

3. **`src/lib/statement-html.ts`** — quick check; if it renders unit anywhere, apply the same default. (Will verify and patch in same pass.)

**Out of scope:** changing the database / product form defaults. This is purely a display fallback so old products without a unit still print cleanly. New products can still leave unit blank and they'll show as piece/পিস automatically.
