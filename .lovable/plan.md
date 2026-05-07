## লক্ষ্য

1. পুরো অ্যাপ জুড়ে "হিসাবের খাতা / Ledger" → "হিসাবের বই / Book" নামকরণ।
2. Quick Sell দিয়ে বিক্রি করলে সেটা যেন Sales Book / বিক্রয়ের বই-তে দেখা যায় এবং row-এ "Quick Sell / কুইক বিক্রয়" title থাকে।
3. ভবিষ্যতের যেকোনো transaction (বিক্রয় হলে বিক্রয়ের বই, ক্রয় হলে ক্রয়ের বই) সঠিক বইতে hit করার নিয়ম বজায় রাখা।

## পরিবর্তনের তালিকা

### 1. Label rename (খাতা → বই, Ledger → Book)

নিচের জায়গাগুলোতে label/text বদলানো হবে। কোনো route URL, table name, বা business logic বদলাবে না — শুধু displayed text।

| File | কী বদলাবে |
|---|---|
| `src/lib/i18n.tsx` | EN: `Sales Ledger → Sales Book`, `Purchase Ledger → Purchase Book`, `Due Ledger → Due Book`, `Expense Ledger → Expense Book`। BN: `বিক্রয়ের খাতা → বিক্রয়ের বই`, `ক্রয়ের খাতা → ক্রয়ের বই`, `বাকির খাতা → বাকির বই`, `খরচের খাতা → খরচের বই`। |
| `src/components/app/AppSidebar.tsx` | পাঁচটা menu item: ক্রয়ের বই / Purchase Book, বিক্রয়ের বই / Sales Book, বাকির বই / Due Book, খরচের বই / Expense Book, মালিকের বই / Owner Book। |
| `src/components/app/MobileBackBar.tsx` | একই পাঁচটার BN/EN label। |
| `src/pages/app/SalesLedger.tsx` | header text + "Sell History" → "Sales Book"। |
| `src/pages/app/PurchaseLedger.tsx` | header text। |
| `src/pages/app/DueLedger.tsx` | header text। |
| `src/pages/app/ExpenseLedger.tsx` | header text। |
| `src/pages/app/OwnerLedger.tsx` | header text → "মালিকের বই / Owner Book"। |
| `src/lib/permissions.ts` | "ক্রয়ের খাতা" → "ক্রয়ের বই", "মালিকের খাতা..." labels → "মালিকের বই..."। |

Route paths (`/app/sales-ledger` ইত্যাদি) এবং internal i18n key (`salesLedger`) এখনই পাল্টাবো না — এতে আরো ভাঙার ঝুঁকি নেই, শুধু ব্যবহারকারী যা দেখে সেটাই বদলাবে।

### 2. Quick Sell → Sales Book hit (বাগ ফিক্স)

`src/pages/app/QuickOrder.tsx`-এ ইতিমধ্যে `sales` + `sale_items` + `cash_movements` + `stock_movements`-এ insert হচ্ছে, কিন্তু React Query cache invalidate না হওয়ায় Sales Book-এ পুরোনো cached list দেখায়। Fix:

- Submit successful হলে `queryClient.invalidateQueries({ queryKey: ["sales"] })` এবং `["contacts"]`, `["products"]`, `["cash"]` invalidate করা হবে navigate-এর আগে।
- যদি user note খালি থাকে, `sale.note` হিসেবে `"Quick Sell"` (BN: `"কুইক বিক্রয়"`) সেভ করা হবে — যাতে Sales Book row-তে স্পষ্ট দেখা যায় এটা Quick Sell থেকে এসেছে।

### 3. Sales Book-এ Quick Sell title visibility

`src/pages/app/SalesLedger.tsx`-এ row rendering-এ যদি `note` field থাকে সেটা একটা ছোট badge/subtitle হিসেবে নাম/invoice-এর পাশে দেখানো হবে (যেমন: invoice number-এর নিচে muted text হিসেবে "Quick Sell")। যদি ইতিমধ্যে দেখায়, শুধু verify করা হবে।

### 4. সাধারণ নিয়ম (কোনো নতুন কাজ নয়, শুধু verify)

- `Sell.tsx`, `QuickOrder.tsx` → `sales` table → Sales Book ✅
- `Purchase.tsx` → `purchases` table → Purchase Book ✅
- `Returns.tsx` ইত্যাদি — এই plan-এ touch করছি না।

## কোন ফাইল পরিবর্তন হবে

- `src/lib/i18n.tsx`
- `src/lib/permissions.ts`
- `src/components/app/AppSidebar.tsx`
- `src/components/app/MobileBackBar.tsx`
- `src/pages/app/SalesLedger.tsx`
- `src/pages/app/PurchaseLedger.tsx`
- `src/pages/app/DueLedger.tsx`
- `src/pages/app/ExpenseLedger.tsx`
- `src/pages/app/OwnerLedger.tsx`
- `src/pages/app/QuickOrder.tsx`

## ঝুঁকি / বাইরে রাখা

- Route URL, DB table, query key, permission key — কোনো কিছু rename হবে না (পুরোনো link, bookmark, RLS অক্ষত থাকবে)।
- পুরোনো logic ফেলা হবে না — শুধু label + cache invalidate + note default যোগ।
