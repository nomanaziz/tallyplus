# Business-type ভিত্তিক Module + LPG/পানির বোতল Module

লক্ষ্য: এক-আকারের app থেকে সরে গিয়ে business type অনুযায়ী relevant module দেখানো এবং LPG গ্যাস / পানির বোতল ব্যবসার জন্য একটি পূর্ণাঙ্গ cylinder/bottle tracking module যোগ করা।

## ১. Business Type → Module Mapping (Smart default + toggle)

- `shop_types` table-এ নতুন column: `default_modules text[]` (যেমন `['products','sales','purchase','expense','reports','contacts','cashbook']`)। প্রত্যেক type-এর জন্য default module set seed করা হবে।
- নতুন table: `shop_modules(shop_id, module_code, enabled)` — কোন দোকানে কোন module চালু আছে।
- নতুন shop create হলে shop_type-এর default modules থেকে rows auto-insert হবে (DB trigger)।
- `ShopSettings` page-এ নতুন tab "মডিউল" — toggle দিয়ে যেকোনো module on/off করা যাবে।
- `AppLayout`/sidebar/bottom nav `shop_modules`-এর enabled list দেখে menu item filter করবে। Common module (Dashboard, Contacts, Cashbook, Reports, Profile) সবসময় visible।
- Route guard: কোনো user URL দিয়ে disabled module-এ গেলে "এই মডিউল আপনার দোকানে চালু নেই" message + enable shortcut।

নতুন module code যোগ হবে: `lpg` (LPG/Bottle business)। ভবিষ্যতে service, restaurant, pharmacy-specific module একই pattern-এ যোগ করা সহজ হবে।

## ২. নতুন Shop Type

`shop_types`-এ ২টা নতুন entry যোগ:
- `lpg_gas` — "LPG গ্যাস" / "LPG Gas"
- `water_bottle` — "পানির বোতল / ফিল্টার" / "Water Bottle"

দুটোরই default_modules-এ `lpg` module included থাকবে।

## ৩. LPG/Bottle Module — কী কী থাকবে

### ৩.১ Cylinder/Bottle Inventory
- নতুন table `bottle_types(shop_id, name, size_label, purchase_price, sale_price, deposit_amount)` — যেমন "Bashundhara 12kg", "Jibon 19L"।
- প্রত্যেক bottle_type-এর জন্য realtime stock: **Full / Empty / Out-with-customer** তিন bucket। View থেকে compute হবে।
- "Refill করে এসেছি" entry → empty কমে full বাড়ে।

### ৩.২ Customer-wise Bottle Ledger
- নতুন table `bottle_holdings(shop_id, contact_id, bottle_type_id, qty, deposit_held, last_movement_at)` — কোন কাস্টমারের কাছে এই মুহূর্তে কয়টা bottle আছে।
- Customer profile-এ নতুন section "বোতলের হিসাব" — কয়টা ভর্তি দেওয়া, কয়দিন ধরে, কত deposit।

### ৩.৩ Transaction Types (Refill / Exchange)
- নতুন table `bottle_movements(shop_id, contact_id, type, bottle_type_id, qty, deposit_change, cash_collected, delivery_id, note, occurred_at)` যেখানে `type ∈ {sale_new, refill, return_empty, return_full, deposit_in, deposit_out}`।
- নতুন entry screen: একটাই dialog যেখানে "নতুন বিক্রি / রিফিল / খালি ফেরত" আলাদা tab। Refill = empty নিল + full দিল, এক click-এ দুটাই log হবে।
- প্রত্যেক movement যথাযথভাবে stock, customer holding, deposit ledger update করবে (DB function-এর মধ্যে atomically)।

### ৩.৪ Delivery / Van / Route
- নতুন table `delivery_men(shop_id, name, phone, vehicle_no)`।
- নতুন table `delivery_trips(shop_id, delivery_man_id, trip_date, status, opening_full, opening_empty, closing_full, closing_empty, cash_collected, notes)`।
- প্রত্যেক `bottle_movement`-এ optional `delivery_id` link।
- "ট্রিপ শিট" page: একদিনের নির্দিষ্ট delivery man-এর সব movement, hand cash collection, end-of-day reconciliation (কত bottle নিয়ে বেরোলো, কত ফেরত আনলো, কত টাকা জমা)।

### ৩.৫ Deposit Ledger (আলাদা)
- নতুন table `bottle_deposits(shop_id, contact_id, bottle_type_id, direction, amount, movement_id, occurred_at)` — direction `in`/`out`।
- Customer ledger-এ "বাকি টাকা" এবং "জামানত" দুটি আলাদা balance দেখাবে। Deposit refund বোতল ফেরতের সাথে auto trigger হবে।

## ৪. UI / Navigation

- নতুন top-level route `/app/lpg` যাতে ৪টা tab: ড্যাশবোর্ড (stock summary + আজকের movement), লেনদেন, ট্রিপ, রিপোর্ট।
- LPG ড্যাশবোর্ডে quick stat: মোট full, মোট empty, কাস্টমারের কাছে, আজকের refill সংখ্যা, আজকের cash collection, top 5 due customer।
- Sidebar-এ "LPG / বোতল" icon — শুধু `lpg` module enabled হলে দেখাবে।

## ৫. Reports

- Daily/Monthly bottle movement report
- Customer-wise outstanding bottle + deposit report
- Delivery-man-wise trip summary
- Bottle aging report (কতদিন ধরে কাস্টমারের কাছে আছে)

## ৬. Onboarding Flow পরিবর্তন

- Account create / নতুন shop add করার সময় shop type picker-এ icon grid (LPG, পানির বোতল, ফার্মেসি, মুদি, সার্ভিস ইত্যাদি) — এখন dropdown আছে, সেটা grid-এ convert হবে।
- Type select-এর পরের step-এ "এগুলো আপনার জন্য চালু করা হলো — পরে Settings থেকে আরও যোগ করতে পারবেন" — module preview।

## ৭. Technical Notes

- সব schema change supabase migration হিসেবে যাবে; RLS shop_id-ভিত্তিক existing helper (`has_shop_access`) reuse।
- Stock এবং customer holding maintain হবে DB trigger দিয়ে — frontend শুধু movement insert করবে, derived state DB-তেই update।
- Module visibility hook: `useEnabledModules(shopId)` — `AppLayout`-এ একবার load, context-এ provide।
- Files-এর draft list:
  - migrations: shop_modules + bottle tables + triggers + seed
  - `src/lib/modules.ts` — module registry, default mapping
  - `src/lib/lpg-queries.ts` — bottle CRUD + movement function
  - `src/pages/app/lpg/` — Dashboard, Transactions, Trips, Reports
  - `src/components/app/lpg/*` — MovementDialog, BottleHoldingPanel, TripSheet
  - `src/components/app/ShopTypePicker.tsx` → grid version
  - `src/pages/app/ShopSettings.tsx` → Modules tab
  - `src/pages/app/AppLayout.tsx` → module-aware nav

## পরবর্তী ধাপ

Plan approve হলে আমরা ২ phase-এ যাব:
1. Phase A — shop_modules infra + ShopSettings module toggle + AppLayout filter + LPG/Water shop types seed।
2. Phase B — পূর্ণাঙ্গ LPG module (tables, movement dialog, trip sheet, reports)।

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
