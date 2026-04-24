## Overview

দুটো বড় feature build করব:
1. **Printer Settings** — Inkjet/Laser, POS Bluetooth, POS USB — ৩টা tab সহ setup guide
2. **Business Reports** — main summary page + ১০টা individual report সহ Print/Download

দুটো page-ই বর্তমানে placeholder। সব data shop-scoped, RLS দিয়ে protected।

---

## 1) Printer Settings (`/app/printer`)

Layout: Two-column (left = settings form, right = setup guide tabs)

**Left panel — printer settings form**
- Default printer type: Inkjet/Laser | POS Bluetooth | POS USB (dropdown)
- Printer language: বাংলা | English
- Printer size: A4 | A5 | 80mm | 58mm
- Printer font size: 10–20
- "Print last text" textarea (footer message)
- Toggles: print online store QR, print discount, print VAT, print delivery charge, print customer's previous due, print product unit column
- "Save" / "Cancel" buttons

**Right panel — setup guide (3 tabs)**
- **Inkjet/Laser**: 6-step guide (unbox → cartridge → paper → connect → driver → test print)
- **POS Bluetooth**: 4-step guide + warning note "POS Web Serial API needs Chrome/Edge"
- **POS USB**: 6-step guide + "Download Print Manager" link + warning note

**Storage**
- New `shop_printer_settings` table (one row per shop) — see Database section.
- Settings are read on mount and saved on click.

---

## 2) Business Reports (`/app/reports`)

### Main reports page (matches `report.png`)

Header: back arrow, title "ব্যবসার রিপোর্ট", date-range picker (default current month), Refresh button, "ডাউনলোড/প্রিন্ট" button.

**Section 1 — সাধারণ বিক্রি রিপোর্ট** (single card list)
- মোট বিক্রি
- নগদ বেচা (কাস্টমার বাকি বাদে)
- কাস্টমার থেকে বাকির টাকা পেয়েছেন
- নগদ কেনা (সাপ্লায়ার বাকি বাদে)
- সাপ্লায়ারকে বাকির টাকা দিয়েছেন
- divider
- **সর্বমোট ব্যালেন্স** (formula: total sales + customer-due-received + other income − total purchase − supplier-due-paid − other expense)
- **পণ্য বিক্রি থেকে লাভ** (sale_price − cost_price across sale_items in range)

**Section 2 — অন্যান্য আয় / অন্যান্য খরচ** (2-column cards with totals + green "নতুন আয় যোগ করুন" / red "নতুন খরচ যোগ করুন" buttons → opens add-dialog)

**Section 3 — মোট বাকি** (2-column: green "সাপ্লায়ারকে দিবো" + red "কাস্টমার থেকে পাবো" with totals)

**Section 4 — ব্যবসার সকল রিপোর্ট** (5×2 icon grid linking to sub-reports):
1. বিক্রির রিপোর্ট → `/app/reports/sales`
2. ক্রয়ের রিপোর্ট → `/app/reports/purchase`
3. স্টকের রিপোর্ট → `/app/reports/stock`
4. পণ্যের রিপোর্ট → `/app/reports/product`
5. সেরা কাস্টমার → `/app/reports/top-customers`
6. সেরা কর্মচারী → `/app/reports/top-employees`
7. লাভ-ক্ষতি রিপোর্ট → `/app/reports/profit-loss`
8. খরচের রিপোর্ট → `/app/reports/expense`
9. সাপ্লায়ার রিপোর্ট → `/app/reports/supplier`
10. আয়ের রিপোর্ট → `/app/reports/income`

### Individual sub-reports (10 routes)

Common header on each: back arrow, title, "ডাউনলোড/প্রিন্ট" button, "মোট: X" badge, date range picker, Refresh.

| Route | Layout |
|---|---|
| `reports.sales` | Grouped by date → invoice card list (image-47 style: invoice no, total, items count, time, customer name, paid/due badge). Total সেলস badge in header. |
| `reports.purchase` | Same as sales but for purchases (supplier instead of customer). |
| `reports.stock` | Table: # / Name / Stock-in count / Stock-in amount / Stock-out count / Stock-out amount. Search box. (image-48) |
| `reports.product` | Table: # / Product / Sold qty / Revenue / Profit. |
| `reports.top-customers` | Table: # / Name / Phone / Orders / Total purchase / Due. |
| `reports.top-employees` | Table: # / Employee / Sales count / Total sales amount. |
| `reports.profit-loss` | Card list: Revenue, COGS, Gross profit, Expenses, Net profit/loss. |
| `reports.expense` | Table: # / Icon (per category) / Category / Count / Amount. (image-49) Click row → drill into expense list for that category. |
| `reports.supplier` | Table: # / Supplier / Phone / Purchase total / Paid / Due. |
| `reports.income` | Table of "অন্যান্য আয়" entries: # / Source / Date / Amount. |

### Print/Download

- Single shared `printReport(html)` util opens a print window with the receipt-style layout from image-46:
  - Shop name + address + phone (top-left)
  - "ব্যবসার রিপোর্ট" + date range (top-right)
  - Item rows (label / value, color-coded)
  - "Powered By: Hishabee Business Manager" footer
- Each sub-report passes its own rows to the util.

### Add Income / Expense dialog

Reuses existing `expenses` table for expense; for "অন্যান্য আয়" we add `other_income` table (see DB).

---

## 3) Database

New migration:

```sql
-- Printer settings (one row per shop)
create table public.shop_printer_settings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique,
  printer_type text not null default 'inkjet_laser',
  language text not null default 'bn',
  paper_size text,
  font_size int not null default 14,
  footer_text text,
  print_qr boolean not null default false,
  print_discount boolean not null default true,
  print_vat boolean not null default true,
  print_delivery boolean not null default true,
  print_prev_due boolean not null default true,
  print_unit_column boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- RLS: shop members read, owner manages

-- Other income (parallel to expenses)
create table public.other_income (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null,
  source text,
  amount numeric not null,
  note text,
  paid_via payment_method not null default 'cash',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- RLS: shop members read/write
```

---

## 4) Files

**Create**
- `src/routes/app.printer.tsx` (replace placeholder)
- `src/routes/app.reports.tsx` (replace placeholder — main summary)
- `src/routes/app.reports.sales.tsx`
- `src/routes/app.reports.purchase.tsx`
- `src/routes/app.reports.stock.tsx`
- `src/routes/app.reports.product.tsx`
- `src/routes/app.reports.top-customers.tsx`
- `src/routes/app.reports.top-employees.tsx`
- `src/routes/app.reports.profit-loss.tsx`
- `src/routes/app.reports.expense.tsx`
- `src/routes/app.reports.supplier.tsx`
- `src/routes/app.reports.income.tsx`
- `src/components/app/PrinterSetupGuide.tsx` (the 3-tab right panel)
- `src/components/app/DateRangePicker.tsx` (shared range picker)
- `src/components/app/AddIncomeDialog.tsx`
- `src/components/app/AddExpenseDialog.tsx` (if not present)
- `src/lib/print-report.ts` (shared print util — receipt HTML)

**Modify**
- `src/lib/queries.ts` — add report queries (sales/purchase/expense aggregations, top customers/employees, profit-loss, stock report, other_income)
- `src/lib/icons.ts` — add 10 report sub-icons (lucide-based; we'll skip the uploaded SVG zip which arrived corrupted)

---

## Notes / open questions

- Date-range picker: native `<input type="date">` × 2 (lightweight, mobile-friendly) — no extra deps.
- "Print last text" footer + toggles are persisted but actually applied to the existing receipt printer in a follow-up; this PR ships the settings UI + storage.
- Uploaded `profit-report.zip` icons couldn't be read (corrupted). Using lucide icons instead — let me know if you'd like to re-upload.
