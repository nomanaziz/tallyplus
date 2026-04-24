# Build Out Remaining Pages

আপনি যা চাইছেন:

1. **স্টক পেজ-এ "পণ্যের বিস্তারিত" action** — Stock list-এর প্রতিটি product-এর action button-এ click করলে full product details popup আসবে (সব field সহ — image 1)
2. **"পণ্য সংখ্যা আপডেট" button** — popup-এর ভিতরে এই button (image 2) — single product-এর stock +/- করে save
3. **"স্টক এডিট" page** — সব product একসাথে inline +/- দিয়ে bulk update (image 3 → image 4)
4. **বাকি সব placeholder page** real implementation দিয়ে replace করা (Cashbox, Purchase Ledger, Sales Ledger, Expense Ledger, Contacts, Warranty, Expiring, Recycle Bin, Reports, Marketing, Online Shop, Printer)

---

## ১. Stock Page Updates (`app.stock.tsx`)

বর্তমানে action button শুধু stock edit করে। পরিবর্তন:

- প্রতিটি row-এর action button click করলে **`ProductDetailsDialog`** খুলবে (image 1 layout):
  - Header: product image + name + current stock
  - Grid 3 cols × 3 rows: বর্তমান মজুদ, বিক্রয় মূল্য, লাভ, ক্রয় মূল্য, ডিসকাউন্ট, সাব ক্যাটাগরি
  - "MORE DETAILS": ভ্যাট %, ওয়ারেন্টি, স্টক কমের অ্যালার্ট
  - পণ্যের বিস্তারিত (description) — N/A হলে দেখাবে
  - Footer: **"মুছে ফেলুন"** (red, soft-delete) + **"+ পণ্য সংখ্যা আপডেট করুন"** (black)
- "+ পণ্য সংখ্যা আপডেট করুন" click করলে `UpdateStockDialog` খুলবে (image 2): শুধু qty −/+ input + save button (current stock-এর সাথে diff add/subtract করে stock_movements লগ হবে)

## ২. New Route: `app.stock-edit.tsx` (Bulk Stock Edit — image 4)

- Header: ← স্টক এডিট • ক্যানসেল • সংরক্ষণ করুন
- Toolbar: search, sort, filter, refresh
- Table: পণ্যের নাম | বর্তমান মজুদ | দর | **আপডেটেড স্টক** (−/+ input per row)
- Local state-এ সব changes রাখা; Save button click করলে batch update + stock_movements log
- "স্টক এডিট" button (stock page-এ) → এই route-এ navigate করবে (`/app/products` না)

## ৩. Cashbox (`app.cashbox.tsx`)

`cash_movements` table থেকে data:
- Top cards: মোট জমা (sum direction='in'), মোট খরচ (sum 'out'), ব্যালেন্স
- "+ নতুন এন্ট্রি" button → dialog (direction tabs: জমা/খরচ, amount, note)
- Table: তারিখ, নোট, ধরন, পরিমাণ
- Date range filter

## ৪. Purchase Ledger (`app.purchase-ledger.tsx`)

`purchases` join `suppliers`:
- Top cards: মোট কেনা, পরিশোধিত, বাকি
- "+ নতুন কেনা" → `/app/purchase`
- Table: তারিখ, invoice no, supplier, total, paid, due, payment_method
- Row click → details dialog (sale_items list)
- Date filter

## ৫. Sales Ledger (`app.sales-ledger.tsx`)

`sales` join `customers` — same pattern as Purchase Ledger কিন্তু "নতুন বেচা" → `/app/sell`

## ৬. Expense Ledger (`app.expense-ledger.tsx`)

`expenses` table:
- Top card: মোট খরচ
- "+ নতুন খরচ" → dialog (category, amount, note, paid_via)
- Table: তারিখ, category, note, amount, paid_via
- Edit/delete via row dropdown

## ৭. Contacts (`app.contacts.tsx`)

Tabs: কাস্টমার / সাপ্লায়ার / কর্মচারী
- Search, "+ নতুন" button → dialog (name, phone, address)
- Table per tab; row dropdown: edit, delete (soft)
- Click on contact → due history (filter sales/purchases/cash_movements by ref)

## ৮. Warranty (`app.warranty.tsx`)

`warranty_records` (যদি না থাকে — products যেগুলোর `warranty` field আছে সেগুলো listing). For now use products with warranty info via product details. Table: পণ্য, কাস্টমার, কেনার তারিখ, মেয়াদ শেষ, status (active/expired)

## ৯. Expiring (`app.expiring.tsx`)

`products` where `expiry_date IS NOT NULL`:
- Tabs: শীঘ্রই মেয়াদোত্তীর্ণ (next 30 days) / মেয়াদোত্তীর্ণ
- Table: product, stock, expiry_date, days remaining (color-coded)

## ১০. Recycle Bin (`app.recycle-bin.tsx`)

Soft-deleted records (deleted_at IS NOT NULL) থেকে:
- Tabs: প্রোডাক্ট / কাস্টমার / সাপ্লায়ার / বেচা / কেনা / খরচ
- প্রতি row-এ: Restore button (deleted_at = NULL) + Permanent Delete button

## ১১. Reports (`app.reports.tsx`)

Date range picker (today, 7d, 30d, custom):
- Cards: total sales, purchases, expenses, gross profit, net profit
- Top selling products (top 10)
- Sales by day chart (recharts bar)
- Payment method breakdown

## ১২. Marketing (`app.marketing.tsx`)

Simple tools:
- কাস্টমার লিস্ট থেকে SMS draft (number copy / `tel:` / `sms:` link)
- WhatsApp broadcast link generator
- Promotional message templates (preset cards)

## ১৩. Online Shop (`app.online-shop.tsx`)

Coming-soon style কিন্তু useful:
- "সাবস্ক্রিপশন প্রয়োজন" notice
- Product visibility toggle list (`is_online` flag — schema-তে নাই হলে শুধু preview)
- "অনলাইনে শপ লিঙ্ক" generator (placeholder URL)

## ১৪. Printer (`app.printer.tsx`)

Settings page:
- Default invoice template selection (radio: Thermal 58mm / 80mm / A4)
- Invoice header text (shop name, phone, address) — saved to localStorage
- Print test button (window.print preview)
- Footer message field

---

## Technical Notes

- `src/lib/queries.ts`-এ নতুন query options add: `cashMovementsQuery`, `salesListQuery`, `purchasesListQuery`, `expensesListQuery`, `contactsQuery(type)`, `recycleBinQuery(table)`, `reportsSummaryQuery(range)`
- `staleTime: 60_000` রাখব performance-এর জন্য
- সব route-এ `loader: ensureQueryData(...)` দিয়ে instant navigation (slowness fix-এর continuation)
- New route file: `src/routes/app.stock-edit.tsx` (code-splitter auto-registers, route tree regenerate হবে build time-এ)
- New components: `ProductDetailsDialog.tsx`, `UpdateStockDialog.tsx`, `EntryFormDialog.tsx` (reusable for cash/expense)
- Reports page-এ recharts ব্যবহার করব (already installed)
- সব dialog-এ Bengali + English label, existing `useI18n` pattern follow

---

## Scope বড়, তাই দুই batch-এ deliver করব:

**Batch 1** (এই turn-এ): Stock details + update + bulk edit page, Cashbox, Purchase Ledger, Sales Ledger, Expense Ledger, Contacts, Recycle Bin
**Batch 2** (next turn-এ): Warranty, Expiring, Reports (charts), Marketing, Online Shop, Printer

Batch 1 approve করলে শুরু করছি।