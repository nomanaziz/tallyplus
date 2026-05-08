## লক্ষ্য

1. **মাসিক খরচ চার্ট** আলাদা পেইজ হিসেবে না রেখে সরাসরি **খরচের বই** (Expense Book) এর ভেতরে সংযুক্ত করা।
2. নতুন user account খুললে **by default ৫টি common recurring expense** আগেই বানানো থাকবে — user চাইলে edit/delete করতে পারবে।

---

## পরিবর্তনগুলো

### ১. খরচের বই-এ মাসিক খরচ section যোগ

`src/pages/app/ExpenseLedger.tsx` এর মধ্যে একটি নতুন **"মাসিক নির্দিষ্ট খরচ"** section যোগ হবে — preset category tiles আর total cards-এর মাঝে বসবে।

এই section-এ থাকবে:
- **Templates table**: নাম · ধরন · মাসিক টাকা · তারিখ · অবস্থা · Action (edit/delete)
- **"+ নতুন মাসিক খরচ"** বাটন
- **এই মাসের bills** (pending/paid status সহ, "পরিশোধ" বাটন)
- বর্তমান pending banner-টা এই section-এর header হিসেবে কাজ করবে

বর্তমান `src/pages/app/RecurringExpenses.tsx` এর dialog component (`RecExpDialog`, `PayDueDialog`, `calcMonthly` helper) reusable হিসেবে `src/components/app/RecurringExpensesPanel.tsx`-এ extract হবে, এবং Expense Book-এ embed হবে।

### ২. আলাদা পেইজ ও sidebar entry সরানো

- `src/pages/app/RecurringExpenses.tsx` — মুছে ফেলা হবে (logic panel-এ migrated)
- `src/lib/app-routes.tsx` — `/app/recurring-expenses` route বাদ
- `src/components/app/AppSidebar.tsx` — "মাসিক খরচ চার্ট" entry বাদ
- `ExpenseLedger.tsx`-এর pending banner-এর `<Link to="/app/recurring-expenses">` সরানো (এখন একই পেইজে scroll করবে)

### ৩. Default recurring expenses seed

নতুন shop খোলার সাথে সাথে নিচের ৫টি template auto-create হবে:

| নাম | category | kind | amount | day |
|---|---|---|---|---|
| কর্মচারী ১ | salary | fixed | 10000 | 1 |
| সিকিউরিটি গার্ড | other | fixed | 300 | 1 |
| কারেন্ট বিল | utility | variable | 800 | 1 |
| ইন্টারনেট | internet | fixed | 500 | 1 |
| দোকান ভাড়া | rent | fixed | 3000 | 1 |

**Implementation**: `src/lib/default-categories.ts`-এর `ensureDefaultCategories` প্যাটার্ন অনুসরণ করে একটি নতুন `ensureDefaultRecurringExpenses(shopId)` helper বানানো হবে (`src/lib/default-recurring-expenses.ts`)। এটা Expense Book পেইজ load হওয়ার সময় idempotent ভাবে call হবে — যদি shop-এ আগে থেকে কোনো recurring template না থাকে শুধু তখনই seed করবে (per-session cache + DB count check)। User কোনো template delete করলে আবার re-seed হবে না।

---

## Technical Notes

- নতুন migration লাগবে না — schema আগেই আছে।
- Seed logic client-side থেকে normal `insert` করবে (RLS member policy দিয়ে allowed)। কোনো একটা insert fail হলে silent — user manually বানাতে পারবে।
- "মাসিক খরচ চার্ট" এর সব state/query Expense Book পেইজে share হবে; pending count আর banner সরাসরি একই data source থেকে আসবে।
- Auto-trigger `generate_recurring_dues_for_shop` RPC call আগের মতই Expense Book load-এ চলবে।

---

## ফাইল পরিবর্তন সারসংক্ষেপ

- ✏️ `src/pages/app/ExpenseLedger.tsx` — recurring panel embed
- 🆕 `src/components/app/RecurringExpensesPanel.tsx` — extracted reusable panel
- 🆕 `src/lib/default-recurring-expenses.ts` — default seed helper
- 🗑️ `src/pages/app/RecurringExpenses.tsx`
- ✏️ `src/lib/app-routes.tsx` — route বাদ
- ✏️ `src/components/app/AppSidebar.tsx` — entry বাদ
