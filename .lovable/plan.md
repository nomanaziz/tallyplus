# Cashbox — Note (Denomination) Tracking

The user wants Cashbox to work like a real cash drawer: each entry is built up by **counting notes of each denomination** (BDT 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1). The sum of all the notes becomes the entry amount automatically. A new ledger view shows, per note: how many came in, how many went out, current balance, and where they came from (manual / sale / purchase / expense / income / payment).

---

## 1. Database — add denomination breakdown to cash_movements

One additive migration (no breaking change — old rows stay valid):

```sql
ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS denominations jsonb NOT NULL DEFAULT '{}'::jsonb;
```

Shape: `{ "1000": 3, "500": 2, "100": 5, ... }` — only non-zero denominations stored. Sum of `denom × count` must equal `amount`. Validation lives in the client (and a soft DB CHECK is intentionally avoided so manual-amount entries without a breakdown still work).

**Auto-fill for sales/purchases/expenses (best-effort)**: when a sale/purchase/expense/payment is paid in cash, the existing app code already inserts a `cash_movements` row. We extend those insert sites to also pass a denominations payload **only if the user opens the new "Note breakdown" panel during checkout**. Otherwise the field stays `{}` and the entry behaves exactly like today. (No backfill for existing rows.)

---

## 2. Cashbox UI — Note-based entry dialog

Replace the existing `CashEntryDialog` amount field with a denominations grid:

```
┌─ জমা যোগ করুন ────────────────┐
│ ৳ 1000  [  - ] 3 [ + ]  = 3000 │
│ ৳  500  [  - ] 2 [ + ]  = 1000 │
│ ৳  200  [  - ] 0 [ + ]  =    0 │
│ ৳  100  [  - ] 5 [ + ]  =  500 │
│ ৳   50  [  - ] 0 [ + ]  =    0 │
│ ৳   20  [  - ] 1 [ + ]  =   20 │
│ ৳   10  [  - ] 0 [ + ]  =    0 │
│ ৳    5  [  - ] 0 [ + ]  =    0 │
│ ৳    2  [  - ] 0 [ + ]  =    0 │
│ ৳    1  [  - ] 0 [ + ]  =    0 │
│────────────────────────────────│
│ মোট                    ৳ 4,520 │
│ [ Manual amount mode ]         │
│ Note: ___________________      │
│         [Cancel]  [Save]       │
└────────────────────────────────┘
```

- `+` / `-` steppers + direct number input per note.
- Live total displayed at the bottom.
- "Manual amount mode" toggle — falls back to the original single amount field for users who don't want to count notes.
- Save writes `amount` (the sum) + `denominations` JSON.
- For "Cash Out" (খরচ), the picker shows currently-available counts per note as a hint ("আছে: 3") and warns (but doesn't block) if the user tries to take out more of a denomination than the running balance.

Reusable component: `src/components/app/DenominationPicker.tsx` returning `{ counts, total }`.

---

## 3. Cashbox page — new "Note Ledger" tab

The Cashbox page gets two tabs:

- **এন্ট্রি লিস্ট / Entries** (current table, with a new "নোটের ভাঙতি / Notes" column showing chips like `1000×3, 500×2, 100×5`).
- **নোটের হিসাব / Note Ledger** — a per-denomination summary table:

| নোট | জমা সংখ্যা | খরচ সংখ্যা | বর্তমান সংখ্যা | বর্তমান টাকা |
|---|---|---|---|---|
| ৳1000 | 12 | 4 | 8 | 8,000 |
| ৳500  | 20 | 6 | 14 | 7,000 |
| …     |    |    |    |    |
| **মোট** |  |  |  | **17,520** |

Computed client-side from the `cash_movements` rows:
- `inCount[d] = Σ denominations[d] for direction='in'`
- `outCount[d] = Σ denominations[d] for direction='out'`
- `balance[d]  = inCount[d] - outCount[d]`

A date-range filter at the top (reuse `DateRangePicker`) re-computes for the selected window.

Below the table, a small "Source breakdown" card listing how many notes came from each source (`ref_table` = `sales` / `purchases` / `expenses` / `payments` / `other_income` / NULL for manual).

---

## 4. Sales/Purchases/Expense — optional note breakdown

In the existing Quick Sell, Sale form, Purchase form, Expense form, and Payment dialogs, when the payment method is **cash**, add a small "💵 নোটের ভাঙতি দিন" link. Clicking opens the same `DenominationPicker` modal pre-filled with the paid amount (the user just distributes the total across notes). On save, the resulting denominations are passed alongside the existing `cash_movements` insert.

If the user skips it, behaviour is unchanged.

---

## 5. Files

**Created**
- `src/components/app/DenominationPicker.tsx` — reusable note counter
- `src/components/app/NoteLedger.tsx` — denomination-summary table

**Modified**
- `src/routes/app.cashbox.tsx` — add tabs, denomination column, new dialog
- `src/lib/queries.ts` — extend `cashMovementsQuery` to select `denominations`
- `src/integrations/supabase/types.ts` — auto-regenerated after migration
- Sales / Purchase / Expense / Payment forms — small optional "Note breakdown" link (Quick Sell, `app.pos.tsx`, `app.purchase-new.tsx`, `app.expense-ledger.tsx`, payment dialog)

**Migration**
- One `ALTER TABLE cash_movements ADD COLUMN denominations jsonb DEFAULT '{}'`

---

## Out of scope
- No coin/sub-1-taka denominations (BDT in practice uses notes; coins are rare).
- No DB-level validation that `Σ(denom×count) = amount` — enforced in UI only, to keep manual entries painless.
- No backfill of existing `cash_movements` (old entries show "—" in the Notes column).
- Multi-currency note sets — current implementation hardcodes the BDT note set; trivial to extend later.