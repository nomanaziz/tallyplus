# Personal Loans — Partial Repay + Cash on Hand + Voice for Notes

## 1. Partial repayment for personal loans (consumer)

**DB migration** — new table `consumer_loan_payments`:
```
id uuid PK
loan_id uuid FK consumer_loans
user_id uuid
amount numeric  -- positive
paid_via text   -- 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank'
note text
paid_date date default current_date
created_at timestamptz
```
RLS: only owner (`auth.uid() = user_id`)।

`consumer_loans`-এ যোগ:
- `paid_amount numeric default 0` (denormalized running total — trigger maintains)

Trigger `tg_consumer_loan_payment_sync`:
- AFTER INSERT/UPDATE/DELETE on `consumer_loan_payments`:
  - recompute `paid_amount = SUM(amount)` for that loan
  - যদি `paid_amount >= amount` হয় → `is_settled = true, settled_at = now()`, নাহয় `is_settled = false`
  - **No more auto consumer_transactions** for partial pay (see #2)

## 2. Loans excluded from income/expense — দেনা/পাওনা cash-only

বর্তমানে `LoansTab.submit()` এবং `settle()` `consumer_transactions`-এ row insert করে → ফলে summary-তে আয়/ব্যয় হিসেবে দেখায়। এটা ভুল — ধার আয় না, ফেরত খরচ না।

**পরিবর্তন:**
- `LoansTab.tsx` থেকে `consumer_transactions` insert সম্পূর্ণভাবে সরাও (create + settle + payment তিনটাতেই)।
- পরিবর্তে নতুন **Cash on Hand** ledger maintain করা হবে (নিচে #3)।
- One-time data fix migration: `DELETE FROM consumer_transactions WHERE source_loan_id IS NOT NULL` যাতে পুরোনো ভুল entry summary থেকে সরে যায়।

Money page-এর Income/Expense summary আর `consumer_transactions`-এর উপরই depend করে, তাই loan rows বাদ পড়লে স্বাভাবিকভাবে exclude হয়ে যাবে।

## 3. Cash on Hand (ব্যক্তিগত নগদ)

নতুন derived view OR টেবিল `consumer_cash_movements`:
```
id uuid PK
user_id uuid
amount numeric (signed: + in / − out)
direction text 'in' | 'out'
source text  -- 'loan_borrowed' | 'loan_lent' | 'loan_repay_received' | 'loan_repay_paid' | 'manual_adjust'
ref_loan_id uuid null
ref_payment_id uuid null
note text
tx_date date
created_at timestamptz
```
RLS: own user only।

**Auto-population via DB triggers** (so client কোডে duplicate লজিক নেই):
- `consumer_loans` INSERT:
  - `borrowed` → cash IN (+amount, source `loan_borrowed`)
  - `lent` → cash OUT (−amount, source `loan_lent`)
- `consumer_loans` DELETE: reverse the rows (CASCADE-style)
- `consumer_loan_payments` INSERT:
  - parent `lent` → cash IN (পাওনা ফেরত পেলেন, +amount, source `loan_repay_received`)
  - parent `borrowed` → cash OUT (দেনা পরিশোধ করলেন, −amount, source `loan_repay_paid`)

**RPC** `consumer_cash_summary(_user_id)` → `{ cash_in, cash_out, balance }`।

**Money page (`src/pages/customer/Money.tsx`)**:
- নতুন **Cash on Hand** stat card top-এ (balance), green/red অনুসারে।
- Loan tab balance card-এ "নিট" আগের মতই।

## 4. UI — partial repay sheet in `LoansTab.tsx`

- Settle (✓) button → bottom Sheet "পরিশোধ যোগ করুন":
  - Outstanding amount badge (`amount - paid_amount`)
  - Quick buttons: "পুরোটা পরিশোধ" (auto-fills outstanding), custom amount input
  - Paid via select, date, note
  - Save → INSERT into `consumer_loan_payments`
- Loan list item-এ progress bar `paid_amount / amount` দেখাও, "৳X বাকি" text।
- "Payments" expandable history per loan (দেখা ও মুছা যাবে)।

## 5. Voice mic for expense reason (Money page)

`src/pages/customer/Money.tsx` add Sheet-এর "নোট" (cause) input-এ একটা ছোট mic button:
- `useSpeechRecognition({ lang: 'bn-BD', onFinal: (t) => setNote(prev => prev ? prev + ' ' + t : t) })`
- যখন `type === 'expense'` only দেখাবে (চাইলে income-এও — keep universal).
- Same pattern পরে চাইলে অন্যান্য ফর্মেও reuse করা যাবে।

Component: `src/components/app/VoiceTextMic.tsx` (NEW, generic) — accepts `onText: (t)=>void`, identical mic UI as VoiceFordoMic but no parsing।

## 6. Voice fordo on mobile — already wired

`VoiceFordoMic` already exists এবং `CreateFordo.tsx`-এ mounted। User report করেছে mobile-এ কাজ করে না → সম্ভাব্য কারণ:
- Web Speech API mobile Chrome-এ requires HTTPS + mic permission prompt
- iOS Safari-এ `webkitSpeechRecognition` সাপোর্ট নাই (silently false)

**Fix steps:**
- `useSpeechRecognition.ts`-এ better error message: যদি `!supported` → toast "এই device-এ voice support নেই, Chrome/Android ব্যবহার করুন" এবং **Cloud fallback** option suggest করার বদলে এখন স্পষ্ট error দেখাও।
- Permission request আগেই trigger করতে `navigator.mediaDevices.getUserMedia({ audio: true })` start-এর আগে call (একবার), যাতে mobile Chrome এ permission dialog reliably আসে।
- Mobile-এ `continuous: true` Chrome Android-এ buggy → mobile detect করে `continuous: false` use করা ও re-start করা; অথবা MediaRecorder-based fallback (পরে আলাদা PR)।

এই PR-এ minimum permission-prefetch + clearer error যোগ করব — mobile Chrome-এ এতেই 90% solve হয়। iOS users-এর জন্য in-UI ছোট hint লেখা থাকবে।

## Files to change/create

| File | Action |
|---|---|
| `supabase/migrations/<ts>_loans_partial.sql` | NEW — `consumer_loan_payments` table + paid_amount column + triggers + `consumer_cash_movements` table + triggers + cleanup query |
| `src/components/customer/LoansTab.tsx` | EDIT — remove consumer_transactions writes, add Repay sheet, progress bar, payments history |
| `src/pages/customer/Money.tsx` | EDIT — add Cash on Hand stat, mount `<VoiceTextMic/>` next to note input |
| `src/components/app/VoiceTextMic.tsx` | NEW — generic mic that appends transcript to a text setter |
| `src/lib/useSpeechRecognition.ts` | EDIT — pre-request mic permission, better mobile error messaging, mobile-friendly continuous mode |
| `src/integrations/supabase/types.ts` | auto after migration |

কোনো secret লাগবে না (সব Supabase + browser API)।