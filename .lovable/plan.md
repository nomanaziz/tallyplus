# পার্সোনাল মানি ম্যানেজমেন্টে অ্যানালিটিক্স ও বাজেট যোগ

ব্যক্তিগত ব্যবহারকারীদের (`/customer/*`) জন্য গ্রাফ-ভিত্তিক analytics এবং monthly budget feature যোগ করা হবে। MyMoney অ্যাপের idea — minimal, graphical, সহজবোধ্য — অনুসরণ করা হবে, কিন্তু design copy নয়। বর্তমান সব feature অপরিবর্তিত থাকবে।

## নতুন কী যোগ হবে

### ১. Analytics পেইজ — `/customer/analytics`
এক জায়গায় খরচের সম্পূর্ণ ছবি:
- উপরে month switcher (◀ মে, ২০২৬ ▶) + মোট আয়/ব্যয়/ব্যালেন্স summary cards
- **Donut chart** — ক্যাটাগরি অনুযায়ী ব্যয় ভাগ (color-coded, percentage সহ)
- নিচে category-wise list — progress bar + amount + % (MyMoney-এর মত)
- **Bar chart** — গত ৬ মাসের আয় বনাম ব্যয় তুলনা
- **Line chart** — চলতি মাসের দৈনিক ব্যয়ের trend
- Top 5 ব্যয়ের ক্যাটাগরি কার্ড

### ২. Budgets পেইজ — `/customer/budgets`
মাসিক বাজেট planning:
- Month switcher + "মোট বাজেট" ও "মোট খরচ" summary
- প্রতিটি expense category-র পাশে "বাজেট সেট করুন" বাটন (বা বর্তমান বাজেট + progress bar)
- বাজেট সেট থাকলে: progress bar (সবুজ → হলুদ → লাল), "৳X বাকি / ৳Y শেষ", over-budget warning
- "গত মাসের বাজেট কপি করুন" বাটন

### ৩. Navigation আপডেট
- Desktop sidebar-এ (`CustomerLayout.tsx` NAV array) দুটি নতুন লিংক যোগ:
  - "অ্যানালিটিক্স" (PieChart icon)
  - "বাজেট" (Calculator icon)
- `/customer/money` পেইজের header-এ shortcut বাটন: "অ্যানালিটিক্স" ও "বাজেট"
- Mobile bottom nav ৫টি item-ই আছে — অপরিবর্তিত থাকবে (Money পেইজ থেকেই access)

## টেকনিক্যাল ডিটেইল

**Database — নতুন migration:**
```text
consumer_budgets (
  id, user_id, category_name TEXT, month DATE,  -- month-এর ১ তারিখ
  amount_limit NUMERIC, created_at, updated_at
)
UNIQUE (user_id, category_name, month)
RLS: user নিজের row-ই read/write করতে পারবে
```

**ব্যবহৃত existing data:**
- `consumer_transactions` — আয়/ব্যয় aggregate-এর জন্য (category, tx_date, amount, type)
- `consumer_categories` — category list + color/icon

**Charts:** ইতিমধ্যে installed `recharts` ব্যবহার করা হবে (`PieChart`, `BarChart`, `LineChart`, `ResponsiveContainer`)। `src/components/ui/chart.tsx` wrapper কাজে লাগানো হবে যাতে theme tokens মেনে চলে।

**নতুন/বদল হওয়া ফাইল:**
- `supabase/migrations/<ts>_consumer_budgets.sql` — নতুন table + RLS
- `src/pages/customer/Analytics.tsx` — নতুন
- `src/pages/customer/Budgets.tsx` — নতুন
- `src/lib/consumer-analytics.ts` — aggregate query helpers
- `src/lib/app-routes.tsx` — দুই নতুন route register
- `src/pages/customer/CustomerLayout.tsx` — NAV array-এ যোগ
- `src/pages/customer/Money.tsx` — header-এ ২টি shortcut বাটন

**যা ভাঙবে না:**
- বিদ্যমান `Money.tsx`, `History.tsx`, `CashBook.tsx`, loans, recurring rules — সব আগের মতই।
- শুধু additive পরিবর্তন; existing schema, RPC, RLS কিছুই বদলাবে না।

## টোন
Existing app-এর Bangla + minimal aesthetic ধরে রাখা হবে — current design tokens, Card/Button components ব্যবহার করে; কোনো custom hardcoded color নয়।
