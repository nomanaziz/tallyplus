## ব্যবহারকারীর চাওয়া (৪টি জিনিস)

1. **Due Receive option** — কাস্টমার লিস্টে যাদের বাকি (due) আছে, তাদের জন্য "টাকা পেলাম / Received" বাটন থাকবে। বাকি থাকলে red, paid থাকলে normal/gray।
2. **Customer detail/history view** — একটা কাস্টমারে ক্লিক করলে ডান পেইনে তার পুরো ইতিহাস: কোন কোন invoice, কী product কিনেছে, কত paid, কত due, সব payment entries। প্রতিটা invoice থেকে আবার "প্রিন্ট/পাঠাও" করা যাবে।
3. **Price Quotation (মূল্য তালিকা)** — sale না করেই কাস্টমারকে দাম পাঠানোর আগের estimate document।
4. **Challan/Delivery Note (চালান কপি)** — sale-এর সাথে delivery slip print, যেটা product handover-এর সময় দেওয়া হয়।

---

## ১. Due Ledger পেজ আপডেট

**File:** `src/pages/app/DueLedger.tsx`

### Left list (কাস্টমার card):
- Due > 0 হলে amount **red** (`text-rose-600`) এবং একটা ছোট **"Received"/"টাকা পেলাম"** বাটন (green) দেখাবে — ক্লিকে `MoneyDueEntryDialog` খুলবে preset: party=customer, direction=`taking` (টাকা নিচ্ছি), name/phone/contactId পূর্বেই fill করা।
- Due = 0 হলে amount muted color, কোনো receive বাটন না (paid badge দেখাবে)।
- Card-এ ক্লিক করলে selected হবে → ডান পেইনে detail।

### Right pane — Customer detail/history:
যখন একটা contact selected হবে, ডান পেইনে দেখাবে (date range filter সহ):
- Header: name, phone, address, current due balance (red/green)
- "নতুন invoice" + "Quotation" + "Challan" দ্রুত-অ্যাকশন বাটন
- **Tabs**: 
  - **Invoices** — `sales` থেকে এই customer-এর সব sale, প্রতিটায় invoice_no, date, total, paid, due, status badge। Row-এ ক্লিকে existing `InvoiceDialog` খুলবে (already-built reprint pattern, `SalesLedger.tsx`-এর `openInvoice` কোড reuse)। প্রতি row-এ আলাদা **🖨 Reprint**, **📄 Challan**, **WhatsApp share** বাটন।
  - **Payments** — `payments` table থেকে এই customer-এর সব received/given entries (date, amount, method, note)।
  - **Quotations** — নিচের নতুন `quotations` table থেকে।
- Bottom-এ summary: Total purchased, Total paid, Outstanding due।

---

## ২. Database changes

**Migration:** `supabase/migrations/<ts>_quotations_and_challan.sql`

### `quotations` টেবিল (নতুন)
```
id uuid pk default gen_random_uuid()
shop_id uuid not null references shops(id) on delete cascade
customer_id uuid references customers(id) on delete set null
quote_no text not null   -- e.g. Q-20260504-0001
customer_name text       -- snapshot, কাস্টমার delete হলেও থাকবে
customer_phone text
customer_address text
valid_until date
subtotal numeric not null default 0
discount numeric not null default 0
delivery numeric not null default 0
total numeric not null default 0
note text
status text not null default 'draft'  -- draft/sent/converted/expired
converted_sale_id uuid references sales(id) on delete set null
created_by uuid references auth.users(id)
created_at timestamptz default now()
updated_at timestamptz default now()
deleted_at timestamptz
```

### `quotation_items` টেবিল (নতুন)
```
id uuid pk
quotation_id uuid not null references quotations(id) on delete cascade
product_id uuid references products(id) on delete set null
name text not null
qty numeric not null
unit text
price numeric not null
total numeric not null
sort_order int default 0
```

### RLS
দুটো টেবিলে RLS on, policies বানাবো `shop_id`-based যেমন `sales`/`sale_items`-এর pattern (যে user-এর সেই shop-এ access আছে — `has_shop_access(shop_id)` helper বা existing pattern)।

### Challan টেবিল?
**লাগবে না।** Challan মূলত একটা existing sale-এর alternate print template। `sales` + `sale_items` থেকেই challan render হবে।

---

## ৩. Quotation feature

### সাইডবার এন্ট্রি
`AppSidebar.tsx`-এ "Quotation / মূল্য তালিকা" link, route `/app/quotations`।

### পেজ `src/pages/app/Quotations.tsx`
- লিস্ট: quote_no, customer name/phone, total, valid_until, status badge, actions (View/Reprint/Convert to Sale/Delete)
- "+ নতুন Quotation" বাটন → `QuotationFormDialog`

### `src/components/app/QuotationFormDialog.tsx`
POSPage-এর সরলীকৃত version:
- Customer select/add (existing customer combo)
- Item add (existing product picker, manual add allowed)
- Subtotal/discount/delivery/total auto-calc
- Valid until date
- Note
- Save → row ইনসার্ট, success-এ `QuotationDocDialog` খুলে preview/print

### `src/components/app/QuotationDocDialog.tsx`
`InvoiceDialog`-এর copy, কিন্তু:
- Heading: **"মূল্য তালিকা / Price Quotation"**
- "Paid/Due/Previous due" rows বাদ
- "Valid until: <date>" badge
- Footer: "এই দাম শুধু <date> পর্যন্ত প্রযোজ্য / Prices valid until <date>"
- A4 + POS print দুটোই কাজ করবে (একই print CSS)

### Convert to Sale
Quotation list-এ "Convert to Sale" বাটন → POS/Sell পেজ-এ pre-filled items সহ redirect (route param দিয়ে), sale তৈরি হলে `quotations.converted_sale_id` + `status='converted'` আপডেট।

---

## ৪. Challan / Delivery Note feature

Challan = same data, ভিন্ন template — কোনো price/total দরকার নেই (শুধু delivery confirmation):

### `src/components/app/ChallanDialog.tsx` (নতুন)
- Heading: **"চালান / Delivery Challan"**
- Shop block, customer block, **Challan No** = `CH-` + sale.invoice_no
- Date, delivery address (customer.address)
- Items table: **#, Product, Qty, Unit** শুধু (price/total কলাম নেই — চালানে দাম থাকে না, শুধু পণ্য delivery confirm)
- নিচে: "প্রাপ্তি স্বীকার / Received in good condition"
- দুই signature: প্রাপকের স্বাক্ষর, প্রেরকের স্বাক্ষর
- A4 + POS print বাটন (existing `invoice-printing`/`pos-printing` CSS classes reuse)

### Trigger points
1. `POSPage.tsx` — sale complete dialog-এ existing "Invoice" বাটনের পাশে নতুন **"চালান / Challan"** বাটন → `ChallanDialog` খোলে
2. `SalesLedger.tsx` — প্রতি row-এর action menu-তে "চালান প্রিন্ট" option
3. `DueLedger` customer detail Invoices tab-এ প্রতি row-এ challan বাটন

---

## ৫. পরিবর্তিত / নতুন ফাইলের তালিকা

### নতুন
- `supabase/migrations/<ts>_quotations.sql` — quotations + quotation_items + RLS
- `src/pages/app/Quotations.tsx` — quotation list page
- `src/components/app/QuotationFormDialog.tsx` — create/edit quote
- `src/components/app/QuotationDocDialog.tsx` — print/preview quote
- `src/components/app/ChallanDialog.tsx` — delivery note print
- `src/components/app/CustomerHistoryPanel.tsx` — DueLedger-এর right-pane content (invoices/payments/quotations tabs সহ)

### এডিট
- `src/pages/app/DueLedger.tsx` — red color due, Received বাটন, customer select state, right pane → `CustomerHistoryPanel`
- `src/components/app/MoneyDueEntryDialog.tsx` — preset contactId/name/phone props যোগ (existing customer থাকলে নতুন insert না করে শুধু payment entry+balance update)
- `src/components/app/POSPage.tsx` — success dialog-এ Challan বাটন
- `src/pages/app/SalesLedger.tsx` — row action-এ Challan
- `src/components/app/AppSidebar.tsx` — Quotation menu link
- `src/router.tsx` বা routes — `/app/quotations` route যুক্ত

কোনো edge function নতুন বানানোর দরকার নেই — সবই client-side Supabase + existing print CSS।

---

## ৬. Open question

কনফার্ম করার আগে শুধু একটা decision:

- Quotation print template-এ **"Tax/VAT" কলাম** দরকার? (বর্তমান invoice-এ নেই, default নাই রাখছি — চাইলে পরে যোগ করা যাবে।)

বাকি সব plan অনুযায়ী implement করব।