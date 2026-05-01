## Goal

Reports পেজে ১৩টা সাব-রিপোর্ট কার্ড আছে — এর মধ্যে শুধু ৩টা (Owner Ledger, Shop Assets, Owner Report) কাজ করে। বাকি ১০টা "শীঘ্রই আসছে" দেখায়। এই ১০টা রিপোর্ট পেজ তৈরি করতে হবে।

## Good news

`src/lib/queries.ts`-এ ১০টা রিপোর্টের জন্য **ডেটা queries আগে থেকেই লেখা আছে** (`salesReportQuery`, `purchaseReportQuery`, `stockReportQuery`, `productReportQuery`, `topCustomersQuery`, `topEmployeesQuery`, `expenseReportQuery`, `supplierReportQuery`, `incomeReportQuery`)। শুধু UI পেজ + রাউট লাগবে। Profit & Loss-এর জন্য existing `businessReportQuery` থেকেই হিসাব হবে।

## Pages to build (10)

| # | পেজ | Route | Query |
|---|---|---|---|
| 1 | বিক্রির রিপোর্ট | `/app/sales-report` | `salesReportQuery` |
| 2 | ক্রয়ের রিপোর্ট | `/app/purchase-report` | `purchaseReportQuery` |
| 3 | স্টকের রিপোর্ট | `/app/stock-report` | `stockReportQuery` |
| 4 | পণ্যের রিপোর্ট | `/app/product-report` | `productReportQuery` |
| 5 | সেরা কাস্টমার | `/app/top-customers` | `topCustomersQuery` |
| 6 | সেরা কর্মচারী | `/app/top-employees` | `topEmployeesQuery` |
| 7 | লাভ-ক্ষতি রিপোর্ট | `/app/profit-loss` | `businessReportQuery` (productProfit + balance) |
| 8 | খরচের রিপোর্ট | `/app/expense-report` | `expenseReportQuery` |
| 9 | সাপ্লায়ার রিপোর্ট | `/app/supplier-report` | `supplierReportQuery` |
| 10 | আয়ের রিপোর্ট | `/app/income-report` | `incomeReportQuery` |

## Common pattern (every page)

প্রত্যেক পেজে একই layout — `OwnerReport.tsx` কে template হিসেবে follow করব:

- `PageHeader` + breadcrumb + title (Bengali/English via `useI18n`)
- `DateRangePicker` (default: এই মাসের শুরু → আজ)
- Refresh button + Print/Download button (`printReport` থেকে)
- Summary tiles (টপে total, count ইত্যাদি)
- Detail table (sortable, mobile responsive — ছোট স্ক্রিনে card, বড়তে table)
- Empty state + loading skeleton
- `RequirePerm group="report"` দিয়ে wrap
- Bengali money formatting (`fmtMoney`)

## Specific contents

1. **বিক্রির রিপোর্ট** — Total sales, cash, due summary tiles + invoice table (invoice no, customer, items, total, paid, due, method, date)
2. **ক্রয়ের রিপোর্ট** — একই pattern, supplier dimension সহ
3. **স্টকের রিপোর্ট** — Per-product in/out qty + amount; total in/out summary
4. **পণ্যের রিপোর্ট** — Per-product sold qty, revenue, profit (sorted by revenue); top performers
5. **সেরা কাস্টমার** — Ranked list: name, phone, orders, total purchase, due
6. **সেরা কর্মচারী** — Ranked: name, sales count, total amount
7. **লাভ-ক্ষতি** — Tile grid: total revenue, total cost, gross profit, expense, net profit (color-coded)
8. **খরচের রিপোর্ট** — Per-category aggregation: count, amount, %; pie/bar friendly
9. **সাপ্লায়ার রিপোর্ট** — Ranked: name, phone, total purchase, paid, due
10. **আয়ের রিপোর্ট** — List of other income entries: source, amount, paid_via, date, note + total

## Wiring

- `src/pages/app/`-এ ১০টা নতুন file create
- `src/lib/app-routes.tsx` — ১০টা lazy import + ১০টা route entry
- `src/pages/app/Reports.tsx` — `subReports` array-তে ১০টা item-এ `to: "/app/..."` add করব এবং "শীঘ্রই আসছে" placeholder লাইনটা সরাব। ক্লিক করলে `nav(to)` দিয়ে navigate করবে।
- `src/lib/preload-routes.ts` — heavy report chunks-কে low-priority preload list-এ যোগ করব (optional, for snappy nav)

## Out of scope

- নতুন database column বা edge function লাগবে না — সব data already available
- Charts (Recharts) — শুরুতে শুধু tiles + tables, পরে চাইলে chart যোগ করা যাবে
- CSV export — শুধু `printReport` (PDF/print) থাকবে এই round-এ

## Estimated impact

১০টা নতুন পেজ + ১টা routes ফাইল edit + ১টা Reports.tsx edit। সব পেজ একই কাঠামো, তাই দ্রুত শেষ হবে।
