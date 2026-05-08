## মাসিক ফিক্সড খরচ — Auto Recurring Bills

দোকানদার একবার তার নিয়মিত মাসিক খরচগুলো (ভাড়া, কর্মচারীর বেতন, বিদ্যুৎ, পানি, ইন্টারনেট, লোনের কিস্তি) "চার্ট" হিসেবে বানিয়ে রাখবে। প্রতি মাসে সেগুলো **automatic একটা bill হিসেবে** তার খরচের বইতে "অপরিশোধিত / due" status-এ এসে যাবে। সে শুধু amount adjust করে (যেটা change হয়, যেমন বিদ্যুৎ bill) "পরিশোধ করুন" চাপলে cashbox থেকে টাকা কেটে নেওয়া হবে।

### 1. New database tables

**`recurring_expenses`** — দোকানের fixed খরচের template
- `shop_id`
- `name` — যেমন "দোকান ভাড়া", "মূল মিটার বিদ্যুৎ", "রহিম ভাইয়ের বেতন"
- `category` — rent / utility / salary / loan / other
- `kind` — `fixed` (একই amount প্রতি মাসে) | `variable` (default amount, প্রতি মাসে edit) | `loan` (principal + interest থেকে monthly auto calc)
- `amount` — fixed/variable-এর জন্য
- `day_of_month` — কত তারিখে bill উঠবে (1–28, অথবা "মাসের শেষ দিন")
- `start_month`, `end_month` — কবে থেকে কবে পর্যন্ত
- `is_active`
- Loan-only fields: `loan_principal`, `loan_annual_interest_rate` (%), `loan_term_months`, `loan_start_date` — সিস্টেম EMI / শুধু interest প্রতি মাসে calculate করে দেবে

**`recurring_expense_dues`** — প্রতি মাসে auto-generate হওয়া bill
- `shop_id`, `recurring_expense_id`
- `due_month` (e.g. 2026-05) — duplicate prevent করার জন্য `(recurring_expense_id, due_month)` unique
- `bill_amount` — প্রথমে template থেকে নেওয়া, user edit করতে পারবে
- `status` — `pending` | `paid` | `skipped`
- `paid_at`, `paid_via`, `expense_id` (পরিশোধের পরে তৈরি `expenses` row-এর reference)

### 2. Auto-generation logic

প্রতি দিন একবার একটা scheduled job চলবে (pg_cron, প্রতি সকাল ৬টা):

1. সব `recurring_expenses` যেগুলো `is_active = true` এবং আজকের তারিখ `day_of_month`-এর সমান বা তার পরে → চলতি মাসের জন্য bill exist না করলে একটা `recurring_expense_dues` row তৈরি করবে।
2. `loan` kind-এর জন্য monthly interest = `principal × (annual_rate/100/12)` formula দিয়ে auto calculate হবে।
3. একইসাথে app খুললে frontend-ও missing month-গুলো backfill করার জন্য একটা lightweight server function call করবে — যাতে cron miss করলেও bill উঠে আসে।

### 3. UI — তিনটা জায়গা

**(ক) নতুন পেজ "মাসিক খরচ চার্ট" — sidebar > হিসাবের বই-এর under**
- Template-এর list (নাম, category, amount, day_of_month, kind)
- "+ নতুন মাসিক খরচ" button → dialog যেখানে category, name, kind (fixed/variable/loan), amount/loan params, day_of_month select করা যাবে
- Edit / pause / delete

**(খ) Dashboard — নতুন widget "এই মাসের বাকি bill"**
- চলতি মাসে যেসব auto-generated due এখনো `pending`, সেগুলোর list + total
- প্রতিটা row-এ "পরিশোধ করুন" button — amount edit করার option সহ

**(গ) খরচের বই (`ExpenseLedger`)**
- উপরে একটা banner: "এই মাসের ৩টা bill এখনো বাকি — দেখুন"
- পরিশোধ করলে normal `expenses` row তৈরি হবে + cashbox থেকে টাকা কাটবে (এখনকার expense flow-এর মতো), শুধু due-এর সাথে link থাকবে

### 4. Loan handling (সহজ rule)

User একটাই simple form পাবে:
- Loan amount (যেমন ১০,০০০), annual interest rate (%), শুরুর তারিখ, কত মাসে শোধ হবে
- System দু'টা option দেখাবে:
  - **শুধু interest প্রতি মাসে** = principal × (rate/100/12)
  - **EMI (interest + principal)** = standard EMI formula
- User যেটা select করবে সেটাই প্রতি মাসে auto bill হিসেবে উঠবে। Loan settle হলে `is_active` off।

### 5. RLS
সব নতুন table-এ shop-scoped policies — owner / admin শুধু নিজের shop-এর recurring expense ও due দেখতে/edit করতে পারবে। Existing shop permission helper-গুলোর সাথে align।

### Files to add / change
- DB migration: `recurring_expenses`, `recurring_expense_dues` + RLS + indexes
- pg_cron job → `/api/public/hooks/generate-recurring-dues` route
- New page: `src/pages/app/RecurringExpenses.tsx`
- New dialog: `src/components/app/RecurringExpenseDialog.tsx`, `src/components/app/PayRecurringDueDialog.tsx`
- Dashboard widget: update `src/pages/app/Dashboard.tsx`
- Banner + link in `src/pages/app/ExpenseLedger.tsx`
- Sidebar entry in `src/components/app/AppSidebar.tsx` (হিসাবের বই section-এ)
- Route + i18n strings

### Out of scope (এখন করছি না)
- Reminder push/SMS notification
- Multi-currency
- Partial payment (একবারে full pay assumed; future enhancement)
