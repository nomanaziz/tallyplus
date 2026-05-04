## সমস্যা কী

বর্তমান `Due Ledger` page-এ:
- বাম পাশে contact list দেখা যায় (customer/supplier/employee)
- কিন্তু একটি contact ক্লিক করলে ডান পাশে কিছুই খোলে না — শুধু "No transactions" empty state
- "Given" / "Received" button কোথাও নেই — ফলে যদি কেউ ৩০০ টাকা দেয়, সেটা update করার কোনো উপায় নেই
- প্রতিটা contact-এর সব transaction history (sales, purchases, due payments) এক জায়গায় দেখা যায় না
- Supplier-কে টাকা দেওয়ার (payable settle), employee-এর সাথে লেনদেন update করার কোনো option নেই

আপনার screenshot-এর Hishabee-style layout-টাই আসলে দরকার — একদম ওইরকম কাজ করতে হবে।

## যা করব

### ১. Contact selection → ডান পাশে full ledger panel

বাম থেকে contact-এ ক্লিক করলে ডান পাশে:
- **উপরে header**: contact name, phone, badge (CUSTOMER/SUPPLIER/EMPLOYEE), বর্তমান **Balance** (পাবো হলে সবুজ, দিবো হলে লাল)
- **Date range filter + refresh + Send Reminder button** (শুধু পাবো-যেটা এমন customer-এর জন্য)
- **Transaction history table**: তারিখ, note, **YOU GOT** column, **YOU GAVE** column, running **BALANCE**
  - sales (due আকারে), purchases, payments, manual due entry — সব এক table-এ time-ordered
- নিচে **Total row** — সবুজ ও লাল মোট
- একদম নিচে **দুটো বড় button**:
  - 🔴 **Given (দিলাম)** — আপনি ওনাকে টাকা দিলেন → cash out
  - 🟢 **Received (পেলাম)** — উনি আপনাকে টাকা দিলেন → cash in

### ২. Given / Received dialog

বাটন চাপলে একটা ছোট dialog খুলবে:
- **Amount** (required)
- **Date** (default: আজ)
- **Payment method**: Cash / bKash / Nagad / Bank / Other
- **Note** (optional, যেমন: "bkash via 01711…")
- **Send SMS** toggle (customer/supplier হলে)

Save করলে:
- `payments` table-এ row insert (direction = `in` Received হলে, `out` Given হলে)
- `cash_movements`-এ corresponding entry
- contact-এর `due_balance` automatically update — যেমন: customer-এর due ৫০০ ছিল, ৩০০ Received হলে → due ২০০
- contact-এর due যদি ০-এর নিচে যায় (extra paid), সেটা **advance** হিসেবে negative balance রাখব
- দিনের history-তে নতুন row সাথে সাথে দেখা যাবে

### ৩. Contact list-এ visual hint

বাম পাশের contact list-এ:
- Due > 0 হলে → **লাল badge "বাকি ৳XXX"** (আপনার screenshot-এর "Given" badge মতো)
- Due = 0 হলে → ছাই/ধূসর "৳0" (paid)
- Due < 0 হলে → **সবুজ badge "অগ্রিম ৳XXX"** (advance)

### ৪. Employee tab — properly working

বর্তমানে employee tab খালি দেখায়। Employee-দের জন্য আলাদা table নেই — বিদ্যমান `customers` table-এ `is_employee` flag আছে কিনা চেক করব; না থাকলে customer table-এ একটা optional `contact_kind` column যোগ করতে হবে (`customer` / `employee`), যাতে তিনটা tab আলাদা list দেখায়।

### ৫. Transaction history aggregation

ডান পাশের ledger-এ যে data দেখাব তার source:
- `sales` (যেখানে customer_id match এবং due > 0 ছিল) → "You Gave" column-এ (পণ্য দিলেন → ওরা বাকি)
- `purchases` (supplier হলে) → "You Got" column-এ (মাল পেলেন → আপনি বাকি)
- `payments` → direction অনুযায়ী একদিকে
- balance running: previous balance + this row impact

## Database changes দরকার

হ্যাঁ, ছোট একটা migration:

1. **`customers` টেবিলে** `contact_kind text default 'customer'` কলাম যোগ — value: `customer` বা `employee`
2. **`payments` টেবিলে** RLS policy যাচাই (insert allow shop members)
3. **Trigger** `payments` insert-এর সময় `customers.due_balance` / `suppliers.due_balance` auto-update করবে

## কোন কোন ফাইল edit/create হবে

**Edit:**
- `src/pages/app/DueLedger.tsx` — ডান panel rebuild, contact ক্লিক handle, balance badges
- `src/components/app/DueTypePickerDialog.tsx` — Employee হিসাব সংযুক্ত
- `src/pages/app/DueHistory.tsx` — sales/purchases ও দেখাবে (শুধু payments না)

**নতুন:**
- `src/components/app/ContactLedgerPanel.tsx` — ডান পাশের full panel (header + table + Given/Received buttons)
- `src/components/app/PaymentEntryDialog.tsx` — Given/Received dialog
- `src/lib/contact-ledger.ts` — sales+purchases+payments aggregate করে ledger rows বানানোর helper

## বাইরে রাখছি যা

- পুরাতন `MoneyDueEntryDialog` (নতুন entry তৈরি করার জন্য) যেমন আছে তেমন থাকবে — সেটা শুধু "নতুন বাকি" button-এর কাজ
- Employee সম্পর্কিত আলাদা payroll feature এই scope-এ নেই — এখন শুধু "এক employee-এর সাথে কে কত পাবে/দিবে" সেই hisab
