# Dashboard-এ Interactive Charts যোগ করা

Customer dashboard (`/customer/dashboard`) এবং shop owner dashboard (`/app/dashboard`)-এ eye-catching, interactive chart যোগ করা হবে যাতে দেখতে professional লাগে। Chart library হিসেবে `recharts` (already installed and used in Analytics page) ব্যবহার করা হবে।

## কী কী যোগ হবে

### ১. Customer Dashboard (`src/pages/customer/Dashboard.tsx`)

বর্তমানে শুধু স্ট্যাট কার্ড আর shortcut আছে। নিচের ৩টি chart section যোগ হবে — summary card-এর নিচে, "মোট সারসংক্ষেপ"-এর উপরে।

- **আয় বনাম ব্যয় Donut** (এই মাস)
  - Income vs Expense ছোট donut chart, মাঝে net balance দেখাবে
  - Hover-এ tooltip; ট্যাপ করলে `/customer/analytics`-এ যাবে

- **গত ৬ মাসের Trend (Area chart)**
  - Stacked/overlapping area: আয় (সবুজ) ও ব্যয় (লাল)
  - মাসের label বাংলায়, smooth curve, gradient fill
  - Tooltip-এ মাসভিত্তিক income/expense

- **শীর্ষ ৫ ব্যয়ের ক্যাটাগরি (Horizontal bar)**
  - এই মাসের top 5 expense category, progress-style bar
  - প্রতিটার পাশে amount + %

তিনটাই click-able → `/customer/analytics`-এ navigate করবে যাতে user বিস্তারিত interactive analysis দেখতে পারে।

### ২. Shop Owner Dashboard (`src/pages/app/Dashboard.tsx`)

বর্তমান summary card-এর নিচে একটা compact "Insights" section যোগ হবে যেখানে নিচের ২টি chart থাকবে (selected range অনুযায়ী):

- **Sales Trend (Line/Area chart)** — গত ৭/৩০ দিনের daily sales
- **Income Composition (Donut)** — Sales / Purchases / Expenses ratio

Chart ছোট, mobile-responsive, এবং `/app/reports`-এর সাথে link থাকবে।

## Data Source

- Customer: existing `loadMonthTransactions` ও `loadLastNMonths` থেকে (`src/lib/consumer-analytics.ts`) — কোনো নতুন query লাগবে না
- Shop owner: existing `dashboardSummaryQuery` extend করা হবে অথবা নতুন একটা lightweight `dashboardTrendQuery` `src/lib/queries.ts`-এ যোগ হবে (গত ৩০ দিনের daily aggregate)

## Technical Details

- Library: `recharts` (already installed, used in `Analytics.tsx`)
- Colors: `CHART_COLORS` from `src/lib/consumer-analytics.ts` + semantic tokens (`--primary`, `--success`, `--destructive`)
- Responsive: `ResponsiveContainer` দিয়ে, mobile-এ height কম (160-180px), desktop-এ 220-260px
- Loading: skeleton placeholder যাতে layout shift না হয়
- কোনো DB schema change নেই, কোনো নতুন migration নেই

## ফাইল পরিবর্তন

- `src/pages/customer/Dashboard.tsx` — chart section + data fetching extend
- `src/pages/app/Dashboard.tsx` — insights section যোগ
- `src/lib/queries.ts` — shop owner trend query (যদি প্রয়োজন হয়)
- (নতুন helper component) `src/components/customer/DashboardCharts.tsx` — chart UI গুলো এখানে রাখা হবে যাতে Dashboard.tsx ছোট থাকে
