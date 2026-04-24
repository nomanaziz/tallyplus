## Goal

1. Sale/Purchase সফল হলে একটা সুন্দর print-ready invoice popup আসবে (Hishabee-style — screenshot এর মতো)। Print button দিয়ে print/PDF করা যাবে।
2. কেনার খাতা (Purchase Ledger) page একটা proper list view হবে — যোগাযোগ, ইনভয়েস নং, ব্যাচ, আইটেম সংখ্যা, টাকা, তারিখ, পেমেন্ট অবস্থা, Action menu। উপরে "মোট ক্রয়" badge ও "ডাউনলোড/প্রিন্ট" button।

Shop info (নাম, ঠিকানা, মোবাইল, logo) ইতিমধ্যে `shops` table-এ আছে (`useShop().current`) — invoice header এ সেটাই দেখাবে। নতুন কোনো DB পরিবর্তন লাগবে না।

---

## Changes

### 1. New: `src/components/app/InvoiceDialog.tsx`
Reusable invoice popup। Props:
- `open`, `onClose`
- `mode`: `"sell" | "purchase"`
- `shop`: name, address, phone, logo_url
- `party`: name, phone, address (customer / supplier)
- `invoiceNo`, `date`
- `items`: [{ name, qty, unit, price, total }]
- `subtotal`, `discount`, `delivery`, `grandTotal`, `paid`, `previousDue`, `currentDue`

Layout (screenshot অনুযায়ী):
- Header: ✅ "Successful" + close (X)
- Shop block: logo + name + address + phone
- Centered "ইনভয়েস" title
- Two-column meta: সাপ্লায়ার/ক্রেতা (left) + কিনেছেন/বিক্রেতা + ইনভয়েস নং + তারিখ (right)
- Items table: # | পণ্যের নাম | পরিমান | ইউনিট | ইউনিট মূল্য | মোট  → with মোট row
- Totals block: পূর্বের বাকি, বর্তমান বাকি, টোটাল বাকি (left); সাব টোটাল, ছাড়, ডেলিভারি, মোট, পরিশোধিত, বাকি আছে (right)
- "এমাউন্ট (কথায়):" — Bangla number-to-words helper (small inline util)
- Signature lines: ক্রেতার স্বাক্ষর / বিক্রেতার স্বাক্ষর
- Footer: print timestamp + full-width "Print" button

Print: dedicated `@media print` styles (hide chrome, only show invoice). Use `window.print()` on Print click. Add a `print:hidden` class on dialog header/close/print button so only the invoice body prints.

### 2. Update: `src/components/app/POSPage.tsx`
- After successful save in `PaymentDialog.save()`, instead of immediately calling `props.onSaved()`, capture the saved data (invoice_no fallback to short id, items, totals, party, paid) into a local state and open `InvoiceDialog`.
- Closing the invoice dialog → calls `props.onSaved()` (which clears cart / closes payment dialog).
- Pass `mode` ("sell"/"purchase") through so labels swap (ক্রেতা vs সাপ্লায়ার, "কিনেছেন" vs "বিক্রেতা" = shop name).

### 3. Rewrite: `src/routes/app.purchase-ledger.tsx`
Match screenshot layout:
- Top row: small "Purchase History" breadcrumb, big bold "লেনদেনের ইতিহাস" heading. Right side: black "ডাউনলোড/প্রিন্ট" button + light "মোট ক্রয়: ৳X" badge.
- Toolbar: search box + date range picker (month default) + status filter dropdown (All / নগদ / বাকি) + Refresh.
- Table columns: যোগাযোগ (supplier name + phone small), ইনভয়েস নং, ব্যাচ নং (—), আইটেম (count), টাকার পরিমান, তারিখ (Bangla format), পেমেন্ট অবস্থা (green pill "নগদ টাকা" or amber "বাকি"), Action (3-dot menu).
- Action menu items: "ইনভয়েস দেখুন/প্রিন্ট", "বিস্তারিত", "মুছুন" (soft delete via `deleted_at`).
- "ইনভয়েস দেখুন/প্রিন্ট" → loads purchase_items + opens the same `InvoiceDialog` (read-only, mode="purchase").
- "ডাউনলোড/প্রিন্ট" top button → opens an aggregate print view of all filtered rows (simple table; uses `window.print()` with `@media print` to isolate).
- Footer: "Showing X to Y of Z Transactions".

Date range: simple two date inputs (or reuse a small inline range picker). Default to current month.

### 4. Reuse for Sales Ledger (light touch)
`src/routes/app.sales-ledger.tsx` — wire the same Action menu's "ইনভয়েস দেখুন" to open `InvoiceDialog` with `mode="sell"` so the same printable invoice works there too. (Layout already exists — only add the menu + dialog hookup.)

### 5. Small util: `bnNumToWords(n)` inside `InvoiceDialog.tsx`
Inline helper that converts an integer to Bangla words (এক, দুই, … শত, হাজার, লক্ষ, কোটি)। For "এমাউন্ট (কথায়)" line. No external lib.

---

## Out of scope (this batch)
- SMS sending
- Real PDF generation (browser print → "Save as PDF" covers it)
- Editing past purchases (only view + delete)

After approval, build runs and a clean `bun run build` will be verified.
