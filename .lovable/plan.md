## ১. বিক্রয়ের বই ও ক্রয়ের বই — Row click + Invoice Edit

### Row clickable
- `src/pages/app/SalesLedger.tsx` ও `src/pages/app/PurchaseLedger.tsx` — `<TableRow>`-এ `onClick={() => openInvoice(s)}` + `cursor-pointer hover:bg-muted/40` যোগ। Action column-এর dropdown trigger-এ `e.stopPropagation()` যাতে menu খোলার সময় invoice popup না খোলে।
- ফলে যেকোনো row-এ click করলেই invoice popup চলে আসবে — কী কী product বিক্রি/ক্রয় হয়েছে সব দেখা যাবে।

### Invoice Edit (পুরো ইনভয়েস — পণ্য, দাম, বাকি)
নতুন component: `src/components/app/InvoiceEditDialog.tsx` (sale ও purchase দুটোর জন্যই — `mode: "sell" | "purchase"`)।

ফর্মে যা edit করা যাবে:
- Customer/Supplier পরিবর্তন
- প্রতিটি item: পণ্য নাম, qty, price (যোগ/বাদ/পরিবর্তন)
- Discount, paid amount, payment method, note, তারিখ

Save করলে server-side function (একটাই RPC, atomic) যা করবে:
1. পুরনো `sale_items`/`purchase_items` থেকে stock revert (sale = +stock ফেরত, purchase = −stock)
2. নতুন items insert + নতুন stock প্রয়োগ (sale = −stock, purchase = +stock)
3. `sales`/`purchases` row update (subtotal, discount, total, paid, due, customer_id, note, created_at)
4. সংশ্লিষ্ট `payments` row sync (paid amount পাল্টালে)
5. customer/supplier-এর `due_balance` recompute

এটা PostgreSQL function হিসেবে করা হবে (`edit_sale_invoice`, `edit_purchase_invoice`) যাতে partial failure এ কোনো inconsistency না হয়।

UI flow: Sales/Purchase Ledger row → click → InvoiceDialog (view) → "এডিট করুন" button → InvoiceEditDialog। Dropdown menu-তেও "ইনভয়েস এডিট" item যোগ।

Stock নেই এমন পণ্য বাদ/পরিবর্তন হলে warning দেখাবে কিন্তু block করবে না (negative stock হলে toast warning)।

---

## ২. "যোগাযোগ" পেজের নাম পরিবর্তন → **Customer & Staff**

পরিবর্তন:
- `src/components/app/AppSidebar.tsx` — sidebar label: BN `"কাস্টমার ও স্টাফ"`, EN `"Customer & Staff"`
- `src/pages/app/Contacts.tsx` — page title একই
- Route path `/app/contacts` অপরিবর্তিত থাকবে (existing bookmark/link না ভাঙতে)

---

## ৩. কর্মচারী (Employee) উন্নয়ন

### A. কর্মচারী Edit করা
এখন `Contacts.tsx`-এ employee tab-এ Edit button hidden (`tab !== "employees"` condition)। সেটা সরিয়ে employee-র জন্যও Edit button দেখাব। নতুন `EmployeeEditDialog.tsx` খুলবে (existing `ContactDialog` employee fields support করে না)।

### B. নতুন biodata fields (`customers` table-এ যোগ)
Migration — শুধু employee row-এ ব্যবহৃত হবে (contact_kind = 'employee'):
- `salary` numeric — মাসিক বেতন
- `nid` text — NID নম্বর
- `permanent_address` text — স্থায়ী ঠিকানা (existing `address` = বর্তমান ঠিকানা)
- `father_name` text
- `mother_name` text
- `emergency_phone` text — জরুরি যোগাযোগ নম্বর

সব nullable, default null। Customer/Supplier-এ প্রভাব নেই (UI থেকে hide)।

### C. Employee detail panel
Right panel-এ employee select করলে এখন শুধু "এক্সেস ম্যানেজমেন্ট" message দেখায়। সেটার পাশে biodata card দেখাব (নাম, ফোন, salary, NID, পিতা, মাতা, ঠিকানা, emergency contact)।

### D. Delete behavior
Employee delete করলে — existing trigger/RPC (যা auth user মুছে) — verify করে নিশ্চিত করব যে login credential (auth.users row) cascade delete হয়। যদি না হয়, edge function `delete-employee-user` যোগ করব যা service-role দিয়ে `auth.admin.deleteUser()` call করে।

### E. Phone uniqueness
আপনি বলেছেন এটা Supabase auto-handle করে — কোনো extra কাজ নেই।

---

## Files touched (summary)

**Code:**
- `src/pages/app/SalesLedger.tsx`, `src/pages/app/PurchaseLedger.tsx` (row click, edit menu)
- `src/components/app/InvoiceEditDialog.tsx` *(new)*
- `src/components/app/EmployeeEditDialog.tsx` *(new)*
- `src/pages/app/Contacts.tsx` (employee edit, biodata panel, title)
- `src/components/app/AppSidebar.tsx` (label)

**DB migrations:**
- `customers` table: add `salary`, `nid`, `permanent_address`, `father_name`, `mother_name`, `emergency_phone`
- RPC `edit_sale_invoice(sale_id, payload jsonb)` — stock-safe sale edit
- RPC `edit_purchase_invoice(purchase_id, payload jsonb)` — stock-safe purchase edit

**Edge function (if needed):**
- `delete-employee-user` — auth user cleanup on employee delete (only if existing flow doesn't cover it)
