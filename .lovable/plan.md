# Shop Transfer — Online + Manual Payment

বর্তমানে Transfer dialog-এ শুধু একটা ছবি (proof) আপলোডের অপশন আছে। আপনি চান:

1. **Manual** — admin-এর সেট করা নম্বর/instructions clearly দেখাবে (কোন নম্বর, personal/merchant/payment type), user ছবি ও **Transaction ID** দেবে → admin verify করবে।
2. **Online** — আমাদের existing **Recharge Server** gateway দিয়ে ৳200 (admin-set) charge instantly নেবে → success হলে auto-verify হয়ে recipient-এর কাছে accept-এর জন্য চলে যাবে।
3. Admin চাইলে পরে **refund** করতে পারবে (note রাখার সুযোগ)।

---

## Changes

### 1. Database
- `transfer_settings`-এ নতুন কলাম: `payment_number text`, `payment_account_type text` (personal/merchant/agent), `payment_provider_label text` (bKash/Nagad/Rocket ইত্যাদি)। Existing `payment_instructions` থাকবে।
- `shop_transfer_requests`-এ নতুন কলাম:
  - `payment_method text` ('manual' | 'online')
  - `payment_txn_id text` (manual transaction ID)
  - `payment_transaction_id uuid` (FK → `payment_transactions.id` for online)
  - `refunded_at timestamptz`, `refund_note text`, `refund_amount numeric`
- `payment_transactions`-এ `kind` ব্যবহার করে নতুন value `'shop_transfer'`, এবং `shop_transfer_id uuid` কলাম যোগ।

### 2. New Edge Function: `transfer-create-payment`
Existing `recharge-create-payment` / `sms-create-payment`-এর মতই — Recharge Server checkout session create করবে `kind=shop_transfer`, success URL: `/app/shops/transfer-callback?...`। Server side-এ `request_shop_transfer` কে `pending_payment` state-এ insert করে transaction-এর সাথে link করবে।

### 3. Update `recharge-verify-payment`
`tx.kind === 'shop_transfer'` হলে: linked `shop_transfer_requests` row-এর status `pending_payment` → `pending_recipient` করবে এবং admin-verify auto-bypass হবে (since gateway = trusted)।

### 4. New Page: `/app/shops/transfer-callback`
SMS callback-এর মতই — verify করে success/failure দেখাবে, তারপর Shops পেজে redirect।

### 5. `TransferShopDialog.tsx` overhaul
Tab/Radio দিয়ে দুটো option:
- **অনলাইন পেমেন্ট (instant)** — Recharge Server দিয়ে ৳{charge} pay করুন button → `transfer-create-payment` → redirect।
- **ম্যানুয়াল পেমেন্ট** — admin-set details prominently দেখাবে:
  - "এই নম্বরে পাঠান: **01XXXXXXXXX** (bKash — Merchant)"
  - "Amount: **৳200**"
  - Free-text instructions
  - তারপর Screenshot upload + **Transaction ID** input → submit।

`request_shop_transfer` RPC-তে নতুন params: `_payment_method`, `_payment_txn_id`। Online হলে dialog skip করে gateway-এ যাবে।

### 6. Admin Settings (`/admin/transfers` বা Settings)
`transfer_settings` form-এ নতুন fields edit করার UI:
- Payment provider (bKash/Nagad/Rocket/Other)
- Account type (Personal / Merchant / Agent)
- Number
- Instructions (existing)
- Charge amount (existing)

### 7. Admin Transfers Page (`/admin/transfers`)
Each row-এ দেখাবে: payment_method (manual/online), txn_id/proof URL, gateway transaction_id। Manual হলে "Verify Payment" button (existing flow)। Online verified হলে directly recipient-এর accept-এ থাকবে।

নতুন **Refund** action: approved/rejected যেকোনো request-এ admin "Refund" mark করতে পারবে — note + amount log হবে (gateway refund manual-ই thakbe, just record রাখবো)।

### 8. Notification
Manual submit হলে admin-এর কাছে existing notification যাবে। Online success হলে recipient-এর কাছে সরাসরি "নতুন দোকান হস্তান্তর অনুরোধ" notification যাবে।

---

## Acceptance
- Admin Settings-এ payment number/type/provider/instructions/charge সব edit করা যাবে।
- Owner Transfer dialog খুললে দুটো clear option — Online ও Manual।
- Manual flow-এ admin-এর সেট করা নম্বর + amount + instructions দেখা যাবে; screenshot + Transaction ID submit করা যাবে।
- Online flow Recharge Server-এ redirect করবে; success-এ auto pending_recipient হবে।
- Admin payment refund mark করতে পারবে।
