## ধার ও cash-on-hand integration

**সমস্যা:** এখন `consumer_loans` (ধার দেওয়া/নেওয়া) আলাদা ট্র্যাক হয়, কিন্তু এর সাথে account balance (নগদ/বিকাশ) connected না। ফলে wife যখন ৫০০ টাকা ধার দেয়, তার "নগদ" balance unchanged থাকে — যেটা ভুল।

**সমাধান:** ধার = টাকা চলাচল, কিন্তু আয়/ব্যয় না। তাই account balance update করব, কিন্তু income/expense rollup-এ ঢুকবে না।

### ১. নিয়ম (চারটা ঘটনা)

| ঘটনা | account-এ effect | আয়/ব্যয়? |
|---|---|---|
| ধার দিলাম (lent) | নগদ −৫০০ | না |
| ধার ফেরত পেলাম | নগদ +৫০০ | না |
| ধার নিলাম (borrowed) | নগদ +৫০০ | না |
| ধার ফেরত দিলাম | নগদ −৫০০ | না |

### ২. DB পরিবর্তন

- `consumer_loans` টেবিলে `account_id` কলাম যোগ — কোন account থেকে ধার দিল/পেল
- `consumer_loan_payments` টেবিলে `account_id` কলাম যোগ
- নতুন column `consumer_transactions.kind` (default 'regular') — values: `regular`, `loan_out`, `loan_in`, `loan_repay_out`, `loan_repay_in`
- `consumer_transactions.source_loan_id`, `source_loan_payment_id` (FK) — duplicate রোধে unique
- **Trigger** `tg_consumer_loan_movement`:
  - INSERT consumer_loans → একটা hidden tx তৈরি (type: expense if lent, income if borrowed; kind: loan_out/loan_in; amount = principal; account_id = loan.account_id)
  - INSERT consumer_loan_payments → hidden tx (type: income if repaying lent loan, expense if repaying borrowed; kind: loan_repay_in/loan_repay_out)
  - DELETE → reverse tx ও মুছে যাবে (cascade)
- `consumer_transactions` queries যেখানে আয়/ব্যয় summary দেখানো হয় (Dashboard, Money page rollup) — `kind = 'regular'` filter যোগ করতে হবে যাতে আয়-ব্যয়ে loan টাকা না দেখায়
- কিন্তু account balance calculation-এ সব tx (kind সহ) যোগ হবে — তাই হাতে টাকা সঠিক থাকবে

### ৩. UI পরিবর্তন

- **LoansTab "ধার যোগ করুন" form**: account dropdown যোগ ("কোন account থেকে দিচ্ছেন/পাচ্ছেন")
- **Repay sheet**: account dropdown ("কোন account-এ আসছে/যাচ্ছে")
- **Money page hand-cash card**: তিনটা ভাগে দেখাব
  - মোট হাতে: ৳X (income + ধার নেওয়া − ব্যয় − ধার দেওয়া)
  - এর মধ্যে: পাবো ৳A, দিতে হবে ৳B
- নতুন **"টাকার উৎস" breakdown** (optional toggle):
  - নিজের আয় থেকে: ৳
  - ধার নেওয়া থেকে: ৳
  - মোট হাতে: ৳

### ৪. Migration safety

- নতুন কলাম nullable — পুরাতন data unaffected
- পুরনো loan গুলোর জন্য `account_id` null থাকবে, balance impact হবে না (backfill optional, user চাইলে later)
- নতুন loan থেকে rule apply

### Files

- migration: `consumer_loans.account_id`, `consumer_loan_payments.account_id`, `consumer_transactions.kind`, `source_loan_id`, `source_loan_payment_id`, trigger function
- edit: `src/components/customer/LoansTab.tsx` (account dropdown + form/repay), `src/pages/customer/Money.tsx` ও `src/pages/customer/Dashboard.tsx` (kind='regular' filter on income/expense summaries; account balance unchanged), `src/pages/customer/History.tsx` (loan tx visually আলাদা label)

Approve করলে migration আগে দেব, তারপর code।