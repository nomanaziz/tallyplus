## লক্ষ্য
নতুন `DateRangePicker` (বাম পাশে preset list, ডান পাশে "তারিখ পরিবর্তন করুন" custom fields + বাতিল/প্রয়োগ) সব page-এ ব্যবহার করা — যেখানে যেখানে এখনও পুরনো "From date / To date" আলাদা field দেওয়া আছে সেগুলো replace করা।

## যেসব page ইতিমধ্যেই নতুন DateRangePicker use করছে (কোন কাজ নেই)
Reports, SalesReport, PurchaseReport, ExpenseReport, IncomeReport, ProductReport, StockReport, SupplierReport, CombinedReport, OwnerReport, ProfitLoss, TopCustomers, TopEmployees, ReportShell — এগুলো automatically নতুন design পেয়ে যাবে।

## যেসব page-এ range filter আছে কিন্তু raw `<input type="date">` ব্যবহার হচ্ছে → replace করব
1. `src/pages/app/SalesLedger.tsx`
2. `src/pages/app/PurchaseLedger.tsx`
3. `src/pages/app/ExpenseLedger.tsx` (list filter অংশে; entry dialog-এর single date field ঠিক থাকবে)
4. `src/pages/app/DueHistory.tsx`
5. `src/pages/app/OwnerLedger.tsx` (list filter; entry dialog ঠিক থাকবে)
6. `src/pages/app/LpgExtras.tsx`
7. `src/pages/app/Assets.tsx`
8. `src/pages/app/Products.tsx` (যদি range filter থাকে)
9. `src/pages/app/Cashbox.tsx` (list filter অংশ; entry dialog ঠিক থাকবে)
10. `src/pages/app/online-shop/PromoCodes.tsx`
11. `src/pages/customer/Money.tsx`
12. `src/components/customer/RecurringRulesTab.tsx`
13. `src/components/customer/LoansTab.tsx`
14. `src/components/app/ContactLedgerPanel.tsx`

প্রতিটাতে করব:
- দুইটা আলাদা `<input type="date">` field সরাব
- `import { DateRangePicker, todayIso, monthStartIso } from "@/components/app/DateRangePicker"` যোগ করব
- `range` state কে `{start, end}` shape-এ রাখব (যদি না থাকে)
- `<DateRangePicker value={range} onChange={setRange} />` বসাব

## যেগুলো টাচ করব না
Entry dialog-এর single date field (backdating-এর জন্য) — `PaymentEntryDialog`, `MoneyDueEntryDialog`, `POSPage`, `QuickSellSheet`, `ProductSerialsDialog`, `Cashbox` entry, `ExpenseLedger` entry, `OwnerLedger` entry। এগুলো range না, তাই আগের মতই একক date field থাকবে।

## Font
আগেই "Noto Sans Bengali" primary করা হয়েছে — নতুন কিছু লাগবে না।

## Verification
প্রতিটা page-এর filter bar-এ নতুন picker রেন্ডার হচ্ছে কিনা preview-তে দেখব; build error না আসলে ঠিক আছে।