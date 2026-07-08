চারটি feature investor section-এ যোগ করব:

## 1. Investor নাম Edit
- Investors list এবং InvestorDetail header-এ একটা pencil icon বাটন।
- Click করলে ছোট dialog → নতুন নাম (+ phone চাইলে) → `UPDATE investors SET name=... WHERE id=...`।

## 2. কিস্তি পরিশোধের তারিখ দেখানো
- এখন শুধু due_date দেখা যায়।
- `investor_installments`-এ `paid_at` (timestamp) column আগে থেকেই আছে কিনা check করব; না থাকলে migration-এ যোগ করব।
- পরিশোধ save করার সময় `paid_at = now()` সেট করব।
- Table-এ "পরিশোধের তারিখ" column যোগ করব — paid হলে date, না হলে "—"।

## 3. Fund/Payment Delete-এ PIN Confirmation
- Investor fund entry বা installment payment delete করার সময়:
  - ConfirmDialog → "সত্যিই delete করবেন?" + 4-digit PIN input।
  - PIN verify হবে current user-এর shop PIN-এর সাথে (যেভাবে অন্য sensitive delete-এ হয়, existing helper থাকলে সেটাই use করব; না থাকলে `profiles.pin_hash` check করে)।
  - ভুল PIN → toast error, delete হবে না।

## 4. কিস্তি Missing হলে জরিমানা (Late Fee)
- Loan তৈরি/edit-এ দুটো optional field:
  - `late_fee_amount` (flat টাকা) বা `late_fee_percent` (%)
  - `late_fee_grace_days` (কত দিন পর থেকে জরিমানা)
- Migration: `investor_loans`-এ 3টা column যোগ।
- Installment table-এ প্রতি unpaid row-এর জন্য due_date পার হলে auto জরিমানা calculate করে show — "জরিমানা: X টাকা (Y দিন late)"।
- পরিশোধের সময় jorimana amount টা payable-এর সাথে যোগ হবে (option: include/exclude toggle)।

## Technical Details
- Files: `src/pages/app/InvestorDetail.tsx`, `src/pages/app/Investors.tsx`, একটা নতুন `PinConfirmDialog` component `src/components/app/`-এ।
- Migration: `investor_installments.paid_at`, `investor_loans.late_fee_amount/percent/grace_days`।
- Late fee calc helper `src/lib/investor-emi.ts`-এ।

## Questions
এই ৪টা এক সাথে করব, নাকি priority অনুযায়ী আগে ২টা (নাম edit + paid date) করব? আর PIN বলতে shop PIN নাকি নতুন আলাদা delete-PIN?
