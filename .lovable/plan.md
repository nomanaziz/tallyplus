## Goal

Desktop-এ `/app/dashboard` কে একটা real "overview" page বানানো — শুধু mobile-style icon menu না। Mobile view আগের মতই থাকবে (icon grid দিয়ে navigation দরকার), কিন্তু desktop-এ extra business information দেখাব এবং ডান পাশের ফাঁকা জায়গা ঠিক করব।

## Changes

### 1. Layout fix (wide screen empty side)
`src/pages/app/Dashboard.tsx` এ wrapper এখন `container px-4 py-4` — Tailwind এর `container` 1536px-এ আটকে যায়, তাই বড় screen-এ ডান দিকে বিশাল gap। এটা পরিবর্তন করে `w-full px-4 py-4 xl:px-6 2xl:px-8` করব যাতে available width পুরোটা ব্যবহার হয়।

### 2. Desktop vs Mobile split
Dashboard component-এ দুইটা layout branch:
- **Mobile (`<md` / hidden md:block)**: এখনকার balance card + sales/purchase/expense + stock/receivable/payable + banner + **icon menu grid** (যেমন আছে তেমন)।
- **Desktop (`hidden md:block`)**: balance card + extended KPI grid (নিচে) + banner + recent activity panels। Icon menu grid hide করে দেব (sidebar আছেই)।

### 3. New desktop KPI widgets
উপরের summary card এর নিচে desktop-only `lg:grid-cols-4` grid:

| Tile | Source |
|---|---|
| আজকের বিক্রি / ক্রয় / খরচ / Balance | already in `dashboard_summary` |
| বাকি দিয়েছি / বাকি নিয়েছি | already in `dashboard_summary` |
| Stock value + Low stock count | `products` (sum, count where stock<=low_stock_alert) |
| মোট পণ্য | `products` count |
| Online shop পণ্য (published) | `products` where `is_marketplace_published=true` |
| Warranty (active) | `warranties` count where end_date >= now |
| গ্রাহক ফর্দ (নতুন/unread) | `customer_wishlists` where `status='new'` (last 7d) |
| অনলাইন order (নতুন) | `online_orders` / `marketplace_orders` where `status='pending'` |
| মোট গ্রাহক | `customers` count |
| মোট supplier | `suppliers` count |
| কর্মচারী | `shop_members` count + 1 (owner) |
| Cash in hand | `cash_movements` net |

প্রতিটা tile-এ icon + label + value + (optional) sub-text এবং relevant page-এ ক্লিকে নিয়ে যাবে।

### 4. Recent activity panels (desktop, 2-column)
- **সাম্প্রতিক বিক্রি** (last 5 sales: customer, total, time)
- **সাম্প্রতিক অনলাইন order / ফর্দ** (last 5)
- **Low-stock products** (top 5)
- **মেয়াদোত্তীর্ণ হবে শীঘ্রই** (warranty/products expiring next 30d)

প্রতি panel-এর header-এ "সব দেখুন" link সংশ্লিষ্ট report page-এ।

### 5. New centralized query
`src/lib/queries.ts`-এ `dashboardOverviewQuery(shopId)` add করব — একটা hook যা parallel-এ extra count/list গুলা fetch করে (60s staleTime)। RLS-এর কারণে সব গুলা existing tables-এ already shop_id filter দিয়ে কাজ করবে।

### 6. Mobile menu button (skip)
আপনার নিজেরই মনে হয়েছে দরকার নাই — তাই বাদ। Desktop-এ menu icon grid পুরোটা hide; sidebar যথেষ্ট। Mobile-এ আগের মতই grid থাকবে।

## Files

- `src/pages/app/Dashboard.tsx` — split mobile/desktop view, new KPI grid + activity panels, container width fix
- `src/lib/queries.ts` — new `dashboardOverviewQuery` (counts + recent lists)

কোনো DB migration লাগবে না — সব data already accessible existing tables থেকে।

## Out of scope

- Mobile dashboard layout পরিবর্তন (যেমন আছে তেমনই থাকবে)
- New backend RPC (client-side parallel queries যথেষ্ট performance-এর জন্য)
