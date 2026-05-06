# Cash Book (মাসিক হিসাব)

একটা নতুন **Cash Book** report যোগ করা হবে — যেখানে প্রতি মাসে কোন খাতে কত আয় হয়েছে আর কোন খাতে কত খরচ হয়েছে সেটা একটা পরিষ্কার "ডেবিট vs ক্রেডিট" view-তে দেখা যাবে। শেষে **Cash on Hand** (নেট ব্যালেন্স) থাকবে।

দুই ভার্সন হবে — design flow এক রাখা হবে, কিন্তু data source আলাদা:

1. **দোকানদারের Cash Book** — `/app/cash-book`
2. **Personal Cash Book** (কনজিউমার) — `/customer/cash-book`

Sample image-টা শুধু "কী তথ্য দেখাতে হবে" সেটার reference — design আমাদের existing app style-এই হবে (PageHeader, Card, semantic tokens, dark/light theme aware)।

---

## Layout (দুই ভার্সনে এক)

```text
┌────────────────────────────────────────────────────┐
│ PageHeader: ক্যাশবুক | Month picker | Print | Share│
├────────────────────────────────────────────────────┤
│  4 Stat cards: মোট আয় | মোট খরচ | নেট | লেনদেন#  │
├──────────────────────────┬─────────────────────────┤
│   ডেবিট (আয়/Income)      │   ক্রেডিট (খরচ/Expense)│
│   ─────────────────────  │   ──────────────────── │
│   খাত            টাকা    │   খাত            টাকা  │
│   বিক্রি         50,000  │   বেতন           8,000 │
│   বকেয়া আদায়    12,000  │   ভাড়া           5,000 │
│   অন্যান্য আয়    2,000   │   বিদ্যুৎ          1,500 │
│   ───────────────────    │   ──────────────────── │
│   মোট           64,000   │   মোট           14,500 │
├──────────────────────────┴─────────────────────────┤
│   Cash on Hand:                       49,500 ৳     │
└────────────────────────────────────────────────────┘
```

নিচে ঐ মাসের সব transaction-এর একটা detailed table (date, খাত, note, debit, credit, running balance) — collapsible।

---

## Month Navigation

- উপরে একটা compact month picker: `← এপ্রিল ২০২৬ →` সাথে dropdown month/year।
- শুধু এক মাসের data — তুলনা চাইলে month switch করে দেখবেন।
- "এই মাস" / "গত মাস" quick chips।

---

## Shop Owner — `/app/cash-book`

Data sources (existing tables, current shop scope, deleted_at IS NULL):

**ডেবিট (আয়):**
- "নগদ বিক্রি" — `sales` মাসের cash অংশ
- "বকেয়া আদায়" — `payments` direction=in (customer)
- "অন্যান্য আয়" — category-wise গ্রুপ from income entries (যদি থাকে), নাহলে single line

**ক্রেডিট (খরচ):**
- "নগদ ক্রয়" — `purchases` cash অংশ
- "সাপ্লায়ারকে দেয়া" — `payments` direction=out (supplier)
- **"অন্যান্য খরচ" category-wise** — `expenses` table-কে category দিয়ে group করে আলাদা line (বেতন, ভাড়া, যাতায়াত, বিদ্যুৎ ইত্যাদি)। এটাই মূল feature — image-এ যেমন।
- "মালিক উত্তোলন" — owner withdraw

Existing `Reports.tsx`-এ এই page-এর জন্য একটা নতুন entry card যোগ হবে: **"ক্যাশবুক / Cash Book"**।

---

## Personal — `/customer/cash-book`

Data source: `consumer_transactions` + `consumer_categories`।

- **ডেবিট (আয়):** type=`income` rows, category-wise group (বেতন, ব্যবসা, উপহার, etc.)
- **ক্রেডিট (খরচ):** type=`expense` rows, category-wise group (বাজার, ভাড়া, যাতায়াত, বিদ্যুৎ, খাবার, etc.) — image-এর মূল chahida এটাই।
- Transfer rows বাদ যাবে (double counting এড়াতে)।
- **Cash on Hand** = মাস শুরুর opening balance + (আয় − খরচ); opening = ঐ তারিখের আগের সব transactions-এর net।

`/customer/money` page-এ একটা CTA button "📒 ক্যাশবুক দেখুন" যোগ হবে।

---

## Print / Share

- "Print" button — existing `print-report.ts` helper দিয়ে A4 print version (image-এর মত two-column layout)।
- Personal version-এ shop name-এর জায়গায় user name।

---

## Technical Details

**নতুন files:**
- `src/pages/app/CashBook.tsx` — owner version
- `src/pages/customer/CashBook.tsx` — personal version
- `src/lib/cash-book-queries.ts` — shared query helpers (month range → grouped debit/credit lines)

**Routing:** `src/lib/app-routes.tsx`-এ দুই route যোগ — owner version `RequirePerm group="report"` দিয়ে wrap, customer version customer layout-এর under।

**Reports hub link:** `src/pages/app/Reports.tsx`-এর `subReports` array-তে নতুন একটা entry: `{ Icon: BookOpen, bn: "ক্যাশবুক", en: "Cash Book", to: "/app/cash-book" }` — সবার উপরে।

**Customer hub link:** `src/pages/customer/Money.tsx`-এ নতুন button "ক্যাশবুক"।

**Data fetching:** React Query, `enabled: !!shopId` (owner) / `!!user` (consumer)।

**Design tokens only** — কোনো hardcoded color না, dark/light উভয় theme-এ ভালো দেখাবে।

---

## Out of scope (এই plan-এ নাই)

- Year-over-year comparison chart
- Category budget / limit alerts
- CSV/Excel export (চাইলে পরে যোগ করব)

Approve করলে দুই page একসাথে build করে দিচ্ছি।