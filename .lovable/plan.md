# RechargeServer Payment Gateway Integration Plan

## কী কী করব

### ১. Admin Panel — Payment Gateway page update (`/admin/payment-gateway`)
বর্তমান page-এ শুধু API URL আর Merchant ID আছে। RechargeServer-এর জন্য সঠিক fields যোগ করব:

- **Enable toggle** (Recharge Server live/sandbox)
- **API Endpoint** (default pre-filled): `https://payment.rechargeserver.com/api/payment/create`
- **Verify Endpoint** (default pre-filled): `https://payment.rechargeserver.com/api/payment/verify`
- **Mode**: Sandbox / Live
- **Test connection** button (সংরক্ষিত key দিয়ে একটা test ping দেবে)

তিনটা সংবেদনশীল key (API-KEY, SECRET-KEY, BRAND-KEY) **codebase-এ store করব না** — Edge Function secrets-এ রাখব:
- `RECHARGE_SERVER_API_KEY`
- `RECHARGE_SERVER_SECRET_KEY`
- `RECHARGE_SERVER_BRAND_KEY`

(Plan approve করার পর আপনার কাছে এই ৩টা key চাইব।)

### ২. Edge Functions তৈরি (২টা)

**a) `recharge-create-payment`** — checkout শুরু করার জন্য
- Input: `plan_id`, `shop_id`, `amount`, `cus_name`, `cus_email`, `metadata`
- কাজ:
  1. `subscription_requests` table-এ একটা pending row insert করবে
  2. RechargeServer `/api/payment/create` call করবে header-এ ৩টা key পাঠিয়ে
  3. `success_url` / `cancel_url` সেট করবে আমাদের verify endpoint-এ point করে
  4. ফেরত আসা `payment_url` user-কে return করবে

**b) `recharge-verify-payment`** — success/cancel redirect handle করবে
- Query param থেকে `transactionId` নিয়ে `/api/payment/verify` call করবে
- `status === "COMPLETED"` হলে subscription activate করবে (plan-এর মেয়াদ অনুযায়ী)
- User-কে app-এর success/failure page-এ redirect করবে

### ৩. Pricing/Subscription page — checkout button wire-up
যেখানে user "Subscribe" / "Buy" click করে, সেখান থেকে `recharge-create-payment` call করে user-কে `payment_url`-এ redirect করব।

### ৪. Success / Cancel landing pages
- `/payment/success?transactionId=...` — verify দেখাবে, subscription active confirm করবে
- `/payment/cancel` — try again button সহ message

### ৫. DB schema (ছোট update)
`subscription_requests` table-এ নতুন column যোগ করব (যদি না থাকে):
- `transaction_id` (text)
- `payment_method` (text)
- `gateway_status` (text)
- `gateway_response` (jsonb)

---

## Approve করলে কী কী লাগবে আপনার থেকে

Plan approve করার পর আমি এই ৩টা secret request করব (RechargeServer dashboard থেকে collect করতে হবে):

1. **API-KEY** (App key — API Credentials section)
2. **SECRET-KEY** (Secret key — API Credentials section)
3. **BRAND-KEY** (Brand key — Brands section)

---

## Technical notes

- Headers (প্রতিটা request-এ): `Content-Type`, `API-KEY`, `SECRET-KEY`, `BRAND-KEY`
- Amount format: trailing zero ছাড়া (e.g. `10`, `10.50`)
- Metadata-এ `plan_id` + `shop_id` পাঠাব যাতে verify-এর সময় কোন user/plan সেটা মেলাতে পারি
- Success URL pattern: `https://<app>/api/payment/recharge-callback?transactionId=...&status=...`
