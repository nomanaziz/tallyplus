## Overview

তিনটা feature:
1. **Shop ownership transfer** — both-side verification + admin approval + charge
2. **Bulk product import** (Excel/CSV)
3. **Bulk product export** (Excel)

---

## ১. Shop Ownership Transfer

### Flow
1. Owner A → Settings/Shops পেজে "Transfer Ownership" বাটন → form: target user-এর phone + reason
2. System target phone-এর registered user খোঁজে। না পেলে error
3. Owner A confirm করে → charge (default ৳200, admin-configurable) তার balance থেকে কাটে। Balance না থাকলে block
4. Request `pending_recipient` status-এ যায় → recipient-এর কাছে in-app notification
5. Recipient accept → status `pending_admin`. Reject → status `rejected`, charge refund
6. Admin approve → `shops.owner_id = to_user_id`, status `approved`. Admin reject → refund

### DB migration
- `shop_transfer_requests` table: `id, shop_id, from_user_id, to_user_id, to_phone, reason, charge_amount, charge_paid, status (pending_recipient|pending_admin|approved|rejected_recipient|rejected_admin|cancelled), recipient_decided_at, admin_decided_at, admin_notes, created_at, updated_at`
- `transfer_settings` (id=true singleton): `charge_amount numeric default 200, is_enabled bool`
- RLS: from/to user নিজের request দেখতে পারবে; admin সব দেখতে/আপডেট করতে পারবে
- RPC `request_shop_transfer(_shop_id, _to_phone, _reason)` — verifies ownership, finds target user, checks balance, creates row
- RPC `respond_shop_transfer(_id, _accept bool)` — recipient only
- RPC `admin_decide_shop_transfer(_id, _approve bool, _notes)` — admin only; updates `shops.owner_id` on approve
- Charge: existing `affiliate_wallet` নয়, বরং নতুন simple `user_wallet` table — কিন্তু এই scope বড় হবে। **সরলীকৃত approach**: charge field রাখা হবে কিন্তু payment integration MVP-তে স্কিপ; admin manually verify করবে user অন্য কোনো method-এ পরিশোধ করেছে কিনা। (যদি user চায়, পরবর্তী iteration-এ proper wallet)

> **নোট**: real money charge integrate করতে গেলে আরেকটা পুরো wallet system লাগবে। MVP-তে: request তৈরি হলে status `pending_payment` → user manually proof upload (image) → admin verify → তারপর recipient-এর কাছে যায়। এটা সবচেয়ে practical।

**Updated status flow**: `pending_payment → pending_recipient → pending_admin → approved/rejected`

### UI
- `src/components/app/TransferShopDialog.tsx` — owner থেকে request initiate, payment proof upload (existing `payment-proofs` bucket reuse)
- `src/pages/app/Shops.tsx`-এ delete-এর পাশে "Transfer" button (only owner)
- `src/components/app/IncomingTransfersBanner.tsx` — Dashboard-এ recipient-এর জন্য pending requests দেখাবে accept/reject সহ
- `src/pages/admin/ShopTransfers.tsx` — admin queue with verify/approve/reject
- AdminSidebar-এ link

---

## ২. Bulk Product Import

### UI
- `src/pages/app/Products.tsx`-এ DataToolbar-এর কাছে "Import" + "Export" বাটন
- Dialog: 
  - Step 1: download template button (`product-import-template.xlsx`) — columns: `নাম, পরিমাণ, ক্রয়মূল্য, বিক্রয়মূল্য, ইউনিট (optional), category (optional), barcode (optional)`
  - Step 2: file upload (.xlsx, .csv)
  - Step 3: preview table — valid/invalid rows highlight, error messages
  - Step 4: confirm import → batch insert

### Library
- `xlsx` (SheetJS) package install — supports both .xlsx & .csv parsing in browser

### Logic
- Parse → normalize column names (Bengali/English both) → validate (name required, prices numeric, qty integer >= 0)
- Check shop's product limit (existing `check_usage_limit` RPC)
- Batch insert via single supabase call with `.insert([...])`
- After insert: invalidate products query

---

## ৩. Bulk Product Export

- "Export" বাটন → বর্তমান filter অনুযায়ী সব products fetch (paginated, all rows) → `xlsx` দিয়ে file generate → download
- Columns: নাম, পরিমাণ, ক্রয়মূল্য, বিক্রয়মূল্য, ইউনিট, category, barcode, total stock value

---

## Files to add/edit

**Migrations**:
- নতুন migration: `shop_transfer_requests` table + RLS + RPCs + `transfer_settings`

**New files**:
- `src/components/app/TransferShopDialog.tsx`
- `src/components/app/IncomingTransfersBanner.tsx`
- `src/components/app/ProductImportDialog.tsx`
- `src/lib/product-export.ts`
- `src/pages/admin/ShopTransfers.tsx`

**Edits**:
- `src/pages/app/Shops.tsx` — Transfer button
- `src/pages/app/Products.tsx` — Import/Export buttons + handler
- `src/pages/app/Dashboard.tsx` — incoming transfer banner
- `src/components/admin/AdminSidebar.tsx` — link
- `src/lib/app-routes.tsx` — admin route
- `package.json` — `xlsx` dep
