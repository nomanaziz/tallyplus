## পরিবর্তন ১: SMS প্যাকেজ কেনার Online + Offline পদ্ধতি (Subscribe-এর মত)

বর্তমানে `src/pages/app/BuySms.tsx`-এ শুধু একটাই path আছে — "Buy" button চাপলে directly `sms_purchase_requests` table-এ pending entry create হয়। কোনো online gateway নেই, payment method/TxnID দেওয়ার option নেই। `Subscribe.tsx`-এ যে রকম সুন্দর dual flow আছে (Plan → Choose how to pay → Online | Manual with method picker + TxnID), হুবহু সেই pattern SMS package-এর জন্যও তৈরি করব।

### `src/pages/app/BuySms.tsx` সম্পূর্ণ rewrite (Subscribe.tsx-এর pattern follow)
- **Step 1 — Package grid**: এখনকার মতই packages render হবে, কিন্তু "Buy" button-এ click করলে directly request যাবে না — বরং `selected` state set হবে এবং নিচে scroll হবে।
- **Step 2 — Choose how to pay**: দুটো বড় card —
  - **অনলাইন পেমেন্ট** (Card / bKash / Nagad / Rocket — instant): `payment_gateway_settings.is_enabled` চেক করব; disabled থাকলে toast দেখিয়ে block করব।
  - **ম্যানুয়াল পেমেন্ট**: Subscribe-এর মত `payment_methods` table থেকে সব active method (bKash/Nagad/Rocket/Bank সহ account number, copy button, instructions) দেখাবে।
- **Online flow**: একটি নতুন edge function `sms-create-payment` তৈরি করব (existing `recharge-create-payment`-এর pattern অনুসরণ করে), যা `sms_packages` থেকে selected package নিয়ে gateway payment URL return করবে। সফল payment-এর পর webhook/callback automatic SMS balance যোগ করবে।
- **Manual flow**: User picks a payment method, পাঠানো টাকার TxnID + optional note input করে। Submit করলে `sms_purchase_requests`-এ insert হবে — extra fields যুক্ত হবে: `payment_method` (bkash/nagad/rocket/bank/other), `txn_id`, `admin_note` (যেখানে selected method name + account number থাকবে)। admin approve করলেই balance যোগ হবে (existing flow).
- **বর্তমান SMS balance card** আগের মতই উপরে দেখাবে।

### Database migration (নতুন columns + edge function support)
- `sms_purchase_requests` table-এ যোগ করব (already exists কিনা check করে): `payment_method text`, `txn_id text`, `admin_note text`, `payment_provider text`, `payment_session_id text`. এতে manual ও online দুটোই track হবে।
- নতুন edge function `supabase/functions/sms-create-payment/index.ts` — input: `package_id`, `origin`, `phone`; output: `payment_url`। existing `recharge-create-payment`-এর কোড reuse করব, শুধু amount/metadata আসবে `sms_packages` থেকে এবং metadata-তে `kind: "sms_package"` রাখব।
- Existing `recharge-payment-callback` (অথবা যেটা subscription verify করে) সেটাতে `kind === "sms_package"` branch যোগ করব — verified হলে `sms_purchase_requests` row-কে `payment_status='approved'` করে `shop_sms_balance`-এ count যোগ করব (অথবা existing trigger এই কাজ করে থাকলে শুধু status update যথেষ্ট)।

## পরিবর্তন ২: একই Customer তিনবার duplicate হওয়া বন্ধ

Screenshot-এ দেখা যাচ্ছে Marketing → "কাস্টমার" tab-এ একই নাম + ফোন নম্বর (Noman / +88 01841577944) তিনবার দেখাচ্ছে। কারণ `customers` table-এ সত্যিই তিনটি row আছে — system আগে duplicate prevent করত না।

### `src/pages/app/Marketing.tsx` — display-level dedupe (immediate fix)
- `contacts` query-র পরে একটি `useMemo` দিয়ে list dedupe করব key হিসেবে `name.trim().toLowerCase() + "|" + normalizePhone(phone)` ব্যবহার করে। প্রথম occurrence-টাই রাখব। এটা supplier ও employee tab-এর জন্যও apply করব।
- ফলে UI-তে আর duplicate দেখাবে না, যদিও DB-তে এখনো থাকতে পারে।

### Root cause fix — Customer create করার জায়গায় duplicate prevention
- যেখানে যেখানে নতুন customer create হয় (POS quick-add, customer page-এর "যোগ করুন", sales ledger-এর customer pick) — সেখানে create-এর আগে existing customer search করব same shop_id + same normalized phone (অথবা phone null হলে same name)। পেলে existing-টা use করব, নতুন তৈরি করব না।
- একই ভাবে supplier-এর জন্যও।

### Database migration — actual cleanup + future prevention
- One-time cleanup migration: প্রতিটি shop-এ same `(shop_id, phone)` (phone non-null) ও same name-এর duplicate customer-গুলোর মধ্যে সবচেয়ে পুরনোটা রেখে বাকিগুলোর সব references (sales, dues ইত্যাদি) merge করে duplicate rows-গুলো soft-delete করব (`deleted_at = now()`).
- নতুন partial unique index: `CREATE UNIQUE INDEX customers_shop_phone_unique ON customers(shop_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;` — ভবিষ্যতে আর duplicate তৈরি হবে না।
- Suppliers-এর জন্য একই index।

## ফাইল পরিবর্তনের সারাংশ
- `src/pages/app/BuySms.tsx` — Subscribe-এর pattern-এ পুরো rewrite (online + manual)।
- `src/pages/app/Marketing.tsx` — display-level dedupe।
- Customer/supplier create করার সব জায়গা (POS, Customers page, Sales ledger ইত্যাদি) — pre-insert duplicate check।
- নতুন migration: `sms_purchase_requests` columns, customers/suppliers cleanup + unique index।
- নতুন edge function: `supabase/functions/sms-create-payment/index.ts`।
- Existing payment callback function-এ `sms_package` branch।