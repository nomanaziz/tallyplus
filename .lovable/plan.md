# Investor System (বিনিয়োগকারী)

Contacts-এ নতুন type: **Investor**। প্রত্যেক investor থেকে এক বা একাধিক investment (loan) নেওয়া যাবে, মাসিক কিস্তি ও সুদ হিসাব হবে, এবং কিস্তি auto নিয়মিত খরচে যাবে।

## User-facing flow

**যোগাযোগ → বিনিয়োগকারী tab**
- Investor add: নাম, phone, ঠিকানা, source type (Bank / সমিতি / ব্যক্তিগত / অন্য), note
- Investor list-এ দেখাবে: মোট নেওয়া, মোট ফেরত, বাকি, পরবর্তী কিস্তি তারিখ

**Investor detail page**
- "নতুন বিনিয়োগ" button — একটি investor একাধিকবার টাকা দিতে পারে
- Investment form:
  - Principal (মূল টাকা), তারিখ
  - সুদ আছে/নেই toggle
  - সুদের হার % + সুদের ধরন (মাসিক / বাৎসরিক / flat / reducing)
  - কিস্তির সংখ্যা (মাস)
  - কিস্তির দিন (মাসের কত তারিখে)
  - প্রথম কিস্তির তারিখ
- Save করলে system EMI schedule generate করবে (principal + interest split সহ)

**Repayment**
- Schedule table: প্রতি মাসের due date, due amount, paid/unpaid, paid date
- "কিস্তি পরিশোধ" button — cash/bank account থেকে টাকা কাটবে ও investor-এর বাকি কমাবে
- মালিকের ব্যালেন্স (Owner/Cash) auto update

**Auto নিয়মিত খরচ**
- প্রত্যেক investment save করলে schedule অনুযায়ী প্রতি মাসের কিস্তি automatically "নিয়মিত খরচ"-এ ঢুকবে (category: "বিনিয়োগের কিস্তি")
- Due date এলে expense entry auto তৈরি হবে (existing recurring_expenses infrastructure ব্যবহার)

**Report (A to Z)**
- Investor summary: মোট নেওয়া, মোট ফেরত (principal + interest আলাদা), বাকি principal, বাকি interest, effective rate
- Per-investor detail: সব installments, paid/unpaid status
- Overall dashboard: সব investor-এর মোট liability, চলতি মাসের কিস্তি, পরিশোধিত সুদ

## Technical details

**Database migration (public schema, RLS by shop_id):**

1. `investors` — shop_id, name, phone, address, source_type enum('bank','somiti','personal','other'), source_name (bank/সমিতির নাম), note, is_active
2. `investor_loans` — investor_id, shop_id, principal, taken_at, interest_rate, interest_type enum('none','flat','reducing_monthly','flat_yearly'), tenure_months, installment_day, first_due_date, total_payable (computed), status enum('active','closed'), recurring_expense_id (FK nullable)
3. `investor_installments` — loan_id, shop_id, seq_no, due_date, principal_part, interest_part, total_due, paid_amount, paid_at, status enum('pending','paid','partial'), expense_id nullable (link to expenses row when auto-created)
4. `investor_payments` — loan_id, shop_id, amount, principal_part, interest_part, paid_at, method (cash/bank), account_id, expense_id, note

All tables: GRANT to authenticated + service_role, RLS via shop membership (reuse existing `is_shop_member` pattern), updated_at trigger.

**EMI calculation helpers (client-side + DB function):**
- flat: interest = principal × rate × tenure_years; EMI = (principal + interest) / months
- reducing_monthly: standard EMI formula
- none: EMI = principal / months

**Auto-expense integration:**
- On loan create → insert one `recurring_expenses` row (monthly, on installment_day, amount = EMI, category "বিনিয়োগের কিস্তি", note references loan)
- Existing `recurring_expenses` cron/materialiser will create expense rows monthly
- Alternative (safer): generate all `investor_installments` upfront, and a DB function/edge cron converts due installments into expense entries + updates installment status

**UI additions:**
- `src/pages/app/Contacts.tsx` — add "বিনিয়োগকারী" tab beside customer/supplier/employee
- `src/pages/app/Investors.tsx` — list page
- `src/pages/app/InvestorDetail.tsx` — investor + loans + installments + payments
- `src/components/app/InvestorEditDialog.tsx`
- `src/components/app/InvestmentDialog.tsx` (new loan form with EMI preview)
- `src/components/app/InstallmentPayDialog.tsx`
- `src/pages/app/InvestorReport.tsx` — full A-Z report
- Add route entries in `src/lib/app-routes.tsx`
- Sidebar link under যোগাযোগ / রিপোর্ট

**Order of build:**
1. Migration (tables + RLS + EMI SQL function + trigger to auto-create installments)
2. Types regenerate
3. Investors list + add dialog (Contacts tab)
4. Investment (loan) create with EMI preview
5. Installment schedule view + pay action (updates cash/bank + expense)
6. Auto-recurring expense hook
7. Report page

## Questions before I start

- সুদের ধরন: শুধু **flat** ও **reducing (মাসিক)** — নাকি simple/no-interest দুটোও যথেষ্ট?
- কিস্তি auto expense-এ যাবে **due date এলে** (automatic) — নাকি user manually "পরিশোধ" button চাপলে তখন expense create হবে? (Manually চাপলে হিসাব বেশি accurate থাকে)
- প্রথম version-এ শুধু **মাসিক কিস্তি** support করব, না-কি সাপ্তাহিক/lump-sum ও লাগবে?