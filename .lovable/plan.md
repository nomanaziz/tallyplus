# Unified Design System + Global Page Cleanup

আপনি ঠিকই বলেছেন — এখন প্রতিটা page নিজের মতো design করছে: কোথাও `container` (সাইড ফাঁকা), কোথাও full-width; কোথাও rounded-xl, কোথাও rounded-2xl, কোথাও rounded-md; summary cards কোথাও colored bg কোথাও plain; "জমা/খরচ" এর মতো বড় বড় custom button কোথাও আছে কোথাও নেই। আমি একবারে পুরো app-wide একটা design language ঠিক করে সব page সেই অনুযায়ী align করে দেব।

## ১. Design Tokens (এক জায়গায় ঠিক করা)

`src/lib/utils.ts`-এ নতুন reusable tokens add করব যাতে future-এও সব এক থাকে:

```text
radius:    card/panel = rounded-xl   (একটাই — 2xl/lg/md মেশানো বন্ধ)
           pill/badge = rounded-md
           avatar/img = rounded-lg
border:    border (1px) — colored borders বাদ; শুধু accent line/ring
surface:   bg-card (panel), bg-muted/30 (page bg), bg-background (input)
shadow:    shadow-sm (panels), shadow (raised), shadow-lg (FAB only)
spacing:   page wrapper = w-full px-3 py-3 sm:px-4 md:px-6 xl:px-8 2xl:px-10
           grid gap = gap-3 (mobile), gap-4 (md+)
buttons:   PageHeader actions → btnToolbar (h-10)
           Row icon → btnRowIcon (h-8 w-8)
           Footer → btnFooter
```

## ২. নতুন shared components

**`PageShell`** (`src/components/app/PageShell.tsx`) — সব page এই wrapper ব্যবহার করবে:
- বাইরে `bg-muted/30 min-h-full`
- ভিতরে `w-full px-3 py-3 sm:px-4 md:px-6 xl:px-8 2xl:px-10 space-y-4`
- এতে desktop-এর সাইড ফাঁকা সমস্যা সব page থেকে এক shot-এ চলে যাবে।

**`StatCard`** (`src/components/app/StatCard.tsx`) — সব summary tile-এর single component:
- White background, 1px border, `rounded-xl`, small icon chip উপরে
- Tone শুধু value-এর text color দিয়ে আসবে (emerald/rose/primary/muted) — colored backgrounds বাদ
- `OwnerLedger`, `Cashbox`, `Products`, `Returns`, `Customer Dashboard`, all reports — সবাই এটাই use করবে।

**`ActionTilePair`** — Cashbox/OwnerLedger-এর "জমা/খরচ", "বিনিয়োগ/উত্তোলন" এর মতো বড় dual-button-এর single shared pattern:
- `rounded-xl border bg-card`, hover-এ subtle accent ring, text-এ tone color (background flat — colored solid block বাদ)
- দুটো page-এই একই rhythm রাখবে।

## ৩. PageHeader refactor

`PageHeader` এখন ভিতরে `container` ব্যবহার করে — ওটা বদলে full-width responsive padding:

```text
header → w-full px-3 sm:px-4 md:px-6 xl:px-8 2xl:px-10
```

ফলে header এবং body একই গ্রিড-এ align থাকবে, কোনো hidden gap নেই।

## ৪. Page-level cleanup (এক pass-এ সব)

প্রতিটা `src/pages/app/*.tsx` page-এ একই pattern apply:
- `<div className="container ...">` → `<PageShell>`
- Inline summary card markup → `<StatCard>`
- Inline action tile markup → `<ActionTilePair>`
- Mixed `rounded-2xl/lg/md` panel → unified `rounded-xl`
- Colored bordered tile (`border-emerald-200 bg-emerald-50`) → neutral panel + tone via text/icon

**Pages touched (one-pass):**
Cashbox, OwnerLedger, OwnerReport, SalesLedger, PurchaseLedger, ExpenseLedger, DueLedger, DueHistory, Products, Returns, Reports, SalesReport, PurchaseReport, ExpenseReport, IncomeReport, ProductReport, StockReport, SupplierReport, ProfitLoss, CombinedReport, CustomerWishlist, FordoHistory, Marketing, Expiring, Warranty, Contacts, Assets, Access, Affiliate, Printer, RecycleBin, BuySms, SmsHistory, Subscribe, TopCustomers, TopEmployees, Training, UsageLimits, Shops, OnlineShop.

## ৫. Reports consistency

সব report page এখন শুধু `ReportShell` use করবে (কিছু page ভুল করে নিজের wrapper বানিয়েছে — Owner Report এ "সাদা-কালো mix", Sales Report এ আলাদা spacing)। সব report:
- একই top: `PageHeader` (breadcrumb + title + DateRange + Refresh + Print)
- একই grid: `StatCard` 4-col (xl) → 3-col (md) → 2-col (sm) → 1-col (mobile), auto-flow
- একই section panel: `rounded-xl border bg-card p-4`

## ৬. Column responsiveness rule

সব summary/KPI grid একই rule:
```text
grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4
```
Cards auto-wrap — যেমন ৪টা ফিট না হলে নিচে চলে যাবে। আর কখনো hardcoded `grid-cols-3` দিয়ে desktop-এ কাটা ছাটা হবে না।

## Files affected

- New: `src/components/app/PageShell.tsx`, `src/components/app/StatCard.tsx`, `src/components/app/ActionTilePair.tsx`
- Edit: `src/components/app/PageHeader.tsx`, `src/components/app/ReportShell.tsx`, `src/lib/utils.ts`
- Edit (wrapper + summary swap): সব `src/pages/app/*.tsx` (~40 ফাইল), `src/pages/customer/Dashboard.tsx`

## যা **change হবে না**

- Functionality, data, query — কিছুই touch করব না, শুধু visual layer.
- Mobile dashboard icon grid আগের মতই থাকবে।
- Color palette (primary/emerald/rose) আগের মতই — শুধু কোথায় কীভাবে use হবে সেটা standardize করছি।

Approve করলে সব এক shot-এ apply করে দেব।
