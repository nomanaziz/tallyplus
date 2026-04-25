# Multi-Shop Selection Page + Combined Report Dashboard

Two missing features that the user has pointed out from the reference screenshots:

1. **Shop Selection Page** (image-60) — a dedicated page where multi-shop owners pick which shop to enter, plus add a new shop.
2. **Combined Report / "সমন্বিত রিপোর্ট"** (combained.png) — a cross-shop consolidated dashboard accessible from Settings → "Complete Dashboard / কমপ্লিট ড্যাশবোর্ড".

No database changes are required — both features query existing `shops`, `sales`, `purchases`, `expenses`, `payments`, `other_income`, `customers`, `suppliers`, `products` tables.

---

## 1. Shop Selection Page — `/app/shops`

**File:** `src/routes/app.shops.tsx`

Replicates the reference design:
- Hishabee logo top-left, "লগআউট" button top-right.
- Title: "দোকান সিলেক্ট করুন".
- Grid of cards (3 per row on desktop, 1 on mobile):
  - Each shop card: shop icon/logo, shop name, address (small), green outline if `current` shop, "সিলেক্ট করুন" button.
  - Last card always: "+ নতুন দোকান যুক্ত করুন" → opens existing shop creation flow.
- Click "সিলেক্ট করুন" → calls `setCurrent(shop)` from `useShop()`, then navigates to `/app/dashboard`.

**Wiring**
- `SettingsSheet` "দোকান পরিবর্তন করুন / Switch Shop" button currently goes to `/app` → change to `/app/shops`.
- `app.tsx` `beforeLoad` redirect from `/app` → keep going to `/app/dashboard` (no change needed).
- The Topbar shop chip (showing current shop name + chevron) becomes clickable → also goes to `/app/shops`.

**Add-shop dialog**: reuse the same `ShopTypePicker + name input + create` logic from `app.tsx`. Extract into `src/components/app/AddShopDialog.tsx` so both the empty-state in `app.tsx` and `app.shops.tsx` can call it.

---

## 2. Combined Report Page — `/app/combined-report`

**File:** `src/routes/app.combined-report.tsx`

Replicates the screenshot exactly:

**Header**
- Breadcrumb: "← সমন্বিত রিপোর্ট" (back arrow → `/app/dashboard`).
- Right side actions: **ডাউনলোড/প্রিন্ট** (black button), **{N}টি দোকান** (shop multi-select dropdown — checkbox list, defaults to all shops), **DateRangePicker** (Apr 01 — Apr 30), **রিফ্রেশ**.
- Tabs: **General Report** (active) / **Details Report**.

**Body — sectioned cards**, each section has: title row (with icon top-right), per-shop breakdown rows, then a bold "মোট" (Total) row coloured green/red:

| Section | Source | Tone |
|---|---|---|
| মোট বিক্রি | sum(sales.total) per shop | green |
| নগদ বেচা (কাস্টমার বাকি বাদে) | sum(sales.paid) per shop | green |
| কাস্টমার থেকে বাকির টাকা পেয়েছেন | sum(payments where direction='in', customer_id not null) | green |
| নগদ কেনা (সাপ্লায়ার বাকি বাদে) | sum(purchases.paid) | red |
| সাপ্লায়ারকে বাকির টাকা দিয়েছেন | sum(payments where direction='out', supplier_id not null) | red |
| সর্বমোট ব্যালেন্স | totalSales + receivedFromCust + otherIncome − cashPurchase − paidToSup − otherExpense | green/red |
| পণ্য বিক্রি থেকে লাভ | sum(sale_items.total − qty*products.cost_price) | green |
| অন্যান্য আয় | sum(other_income.amount) | green |
| অন্যান্য খরচ | sum(expenses.amount) | red |
| সাপ্লায়ারকে দিবো | sum(suppliers.due_balance) | red |
| কাস্টমার থেকে পাবো | sum(customers.due_balance) | green |

Each section has the original screenshot's layout: section title + amount on right (per shop rows + total row at bottom). Use the existing `Row` style from `app.reports.tsx`.

**Details Report tab**: simple table — for each metric × each shop, show the per-shop value with grand total column. (Cross-tab table.)

**Data fetching**
- Add `combinedReportQuery(shopIds: string[], startIso, endIso)` in `src/lib/queries.ts`. It runs the existing `dashboard_summary` RPC for each shop in parallel via `Promise.all`, then merges into:
  ```ts
  { perShop: Record<shopId, Metrics>, totals: Metrics }
  ```
- Use TanStack Query, keyed on `[shopIds, startIso, endIso]`.

**Print / Download**
- Reuse `printReport()` from `src/lib/print-report.ts`. Build per-section rows with each shop sub-row + total row.

---

## 3. Settings & Sidebar Wiring

- `SettingsSheet`: change "কমপ্লিট ড্যাশবোর্ড" target from `/app/dashboard` to `/app/combined-report`. Add another row "সমন্বিত রিপোর্ট" with `BarChart3` icon if the user prefers a separate label (we'll use one — "কমপ্লিট ড্যাশবোর্ড" → combined report — to match the screenshot Settings flow).
- `SettingsSheet`: change "দোকান পরিবর্তন করুন / Switch Shop" from `/app` to `/app/shops`.
- `AppTopbar`: make the shop chip (current shop name + chevron) clickable → goes to `/app/shops`.
- Add a Combined Report icon-link in the dashboard's tile grid for quick access.

---

## 4. Files Summary

**Created**
- `src/routes/app.shops.tsx` — shop selection page
- `src/routes/app.combined-report.tsx` — combined report page
- `src/components/app/AddShopDialog.tsx` — extracted add-shop flow

**Modified**
- `src/components/app/SettingsSheet.tsx` — repoint Complete Dashboard + Switch Shop
- `src/components/app/AppTopbar.tsx` — make shop chip a Link to `/app/shops`
- `src/routes/app.tsx` — use new `AddShopDialog` for empty-state
- `src/lib/queries.ts` — add `combinedReportQuery`
- `src/routes/app.dashboard.tsx` — small "Combined Report" tile in the Others grid

**Routes added**: `/app/shops`, `/app/combined-report`. The TanStack route tree regenerates automatically.

---

## Out of scope
- Server-side aggregation (we run the existing per-shop RPC in parallel — fast enough for typical 1–10 shops).
- Excel export — only PDF/print for now (matches the reference's "ডাউনলোড/প্রিন্ট" button).