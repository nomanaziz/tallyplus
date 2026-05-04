## Goal

Redesign the Service Bookings tab into a complete service-job lifecycle: see the advance payment proof clearly, complete the job with extra products + discount, generate one unified invoice (printable / shareable to the customer), record everything in shop accounts, and track per-service warranty.

---

## 1. Booking card — show + copy advance payment info

In `src/pages/app/Services.tsx` `ServiceBookingsTab`, when `advance_amount > 0` show a structured "অগ্রিম পেমেন্ট" panel with two copy buttons:

- **পাঠানোর নাম্বার** (the customer phone — `customer_phone` is already the sender phone for bKash/Nagad submissions) → "Copy" button.
- **TxnID** (`advance_txn_id`) → "Copy" button.
- Method badge (`advance_payment_method`), amount, paid/unpaid status.

Both copy buttons use `navigator.clipboard.writeText` + toast confirmation. (No schema change — `customer_phone` already represents the sender; we'll relabel it as "পাঠানো নাম্বার / গ্রাহক ফোন".)

If the customer wants to record a *different* sender number than their contact phone, we add an optional `advance_payer_phone text` column to `service_bookings` and an optional field in `ServiceBookingDialog`. Falls back to `customer_phone` when null.

---

## 2. "Complete service" flow → invoice + accounts

Replace the plain "Mark completed" status change with a **"সম্পন্ন করুন ও ইনভয়েস তৈরি করুন"** dialog (`CompleteServiceDialog`). Inside:

- Shows the booked service line: name + booked price, editable **final service charge** (so user can charge less / more than the listed `service_price`).
- **Add extra products** section — reuses the existing product picker (same component used in Sell page) to add line items with qty/price; supports both stocked products and free-text items. Stock is decremented (existing `sales` flow already handles this).
- **Discount** field (flat ৳ or %).
- **Advance adjustment** — auto-deducts `advance_amount` (if `advance_paid`) from the amount due.
- **Customer**: link to existing customer (auto-created if phone matches) so the sale ties to a customer record + due ledger.
- Live total: `service_charge + extras − discount − advance = total / due`.
- Payment method + paid amount → goes into `cash_movements` & `customers.due_balance` via existing sale triggers.

On submit:
1. Insert one row in `public.sales` with `note = 'Service: <name>'`, link to customer.
2. Insert sale_items: one row with `item_type='service'`, `service_id`, name, qty=1, price=final_charge; plus one row per extra product (`item_type='product'`).
3. Update `service_bookings`: `status='completed'`, store `sale_id` (new column) for traceability.
4. If the service has `warranty_enabled`, insert `service_warranties` row with `starts_at = now()`, `expires_at = now() + warranty_value warranty_unit`, link `customer_id`, `sale_id`, `service_id`.

**Schema additions (one migration):**
```sql
alter table public.service_bookings
  add column if not exists advance_payer_phone text,
  add column if not exists sale_id uuid references public.sales(id) on delete set null,
  add column if not exists completed_at timestamptz,
  add column if not exists final_amount numeric,
  add column if not exists discount_amount numeric default 0;
```

---

## 3. Unified invoice (one print for service + extras)

Reuse the existing sales invoice (`src/lib/print-report.ts` already has `printSalesInvoice` patterns — verify and extend if needed). Because step 2 stores everything as **one `sales` row with mixed item_type rows**, the existing invoice renderer naturally prints service line + extra products + discount + advance + total in one document.

Add buttons on the booking card (when `status='completed'` and `sale_id` set):
- "ইনভয়েস প্রিন্ট" → opens print view.
- "WhatsApp/SMS share" → sends a short link / text with invoice summary to `customer_phone` (use existing share helpers).

Customer side: on `/customer/MyServices`, show the invoice link for completed bookings (read via `sale_id`).

---

## 4. Service history & warranty tracking

Add a third tab next to "সার্ভিস তালিকা / বুকিং" → **"সার্ভিস ইতিহাস"**:

- Lists completed bookings (joined with `customers`, `services`, `service_warranties`).
- Filters: date range, customer name/phone, service.
- Each row shows: date, customer + address/area, service name, total ৳, warranty status badge:
  - **Active** — green, with "X দিন বাকি" countdown from `expires_at`.
  - **Expired** — gray.
  - **None** — if service has no warranty.
- Click row → opens detail drawer: full invoice items, advance info, warranty start/expiry, "Print invoice", "Re-service under warranty" button (creates a new booking flagged as warranty claim, free of charge).

Customer-side `MyServices` page also gets a warranty badge per completed service.

---

## Technical breakdown

**Files to add:**
- `src/components/app/CompleteServiceDialog.tsx` — the completion + invoice modal (extras picker, discount, payment).
- `src/components/app/AdvancePaymentInfoCard.tsx` — copyable advance row used inside booking card.
- `src/components/app/ServiceHistoryTab.tsx` — the new tab.

**Files to edit:**
- `src/pages/app/Services.tsx` — add 3rd tab, swap status select for the completion dialog, render advance info card.
- `src/pages/customer/MyServices.tsx` — add warranty badge + invoice link.
- `src/lib/print-report.ts` — confirm/extend invoice template to render mixed service+product rows nicely with "অগ্রিম পরিশোধিত" line.
- `supabase/migrations/<new>.sql` — columns above.

**Reused infra:**
- `sales`, `sale_items`, `customers.due_balance`, `cash_movements` triggers — already wire payments into the shop's accounts (no new accounting code needed).
- `service_warranties` table — already exists with the right shape.
- `tg_notify_new_service_booking` notification path — works as-is.

---

## Out of scope (not in this change)
- Partial / multiple advances (only one advance per booking).
- Multi-currency.
- Recurring services.
