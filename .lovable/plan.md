## Admin "টাকা পাইতে গেলে" Telegram alerts — সব revenue/action events এ notify

### Goal

Admin-এর income source হয় বা admin-এর verification ছাড়া এগোয় না — এমন প্রতিটা event-এ Telegram alert পাঠাব। ফর্দ/সাইনআপ-এর মত pure customer activity বাদ (admin involve না), শুধু admin-related order:

| ঘটনা | কেন admin জানা দরকার | Trigger source |
|---|---|---|
| 💰 অনলাইন পেমেন্ট সফল | Admin-এর আয় ঢুকছে | `payment_transactions` (status `pending` → `completed`) |
| ❌ অনলাইন পেমেন্ট ব্যর্থ | Follow-up call করতে হবে | `payment_transactions` insert/update with status `failed` |
| 📥 Manual subscription request | Admin verify না করলে টাকা বুঝবে না | `subscription_requests` insert (status `pending`) |
| 🏪 Shop transfer request | Admin charge verify করতে হবে | `shop_transfer_requests` insert |
| 💳 Manual transfer payment proof | Admin verify দরকার | `shop_transfer_requests` update with `payment_proof_url` set |
| 🛒 নতুন marketplace order | Admin commission/process | already exists |

(ফর্দ ও সাইনআপ trigger বাদ দেব না — already শব্দ আছে; কিন্তু default events list-এ income-related গুলো আলাদা key দেব যাতে subscriber বেছে নিতে পারে।)

### ১. Migration — নতুন trigger function ও triggers

`dispatch_admin_telegram(_event_type, _title, _body, _link)` already আছে — reuse করব।

নতুন trigger functions:
- `trg_notify_payment_completed` — AFTER UPDATE on `payment_transactions` WHEN OLD.status IS DISTINCT FROM NEW.status AND NEW.status='completed'. Title: `💰 পেমেন্ট সফল ৳<amount>`. Body: provider, plan name, user phone। event_type: `payment_paid`.
- `trg_notify_payment_failed` — AFTER INSERT OR UPDATE on `payment_transactions` WHEN NEW.status='failed' (and (TG_OP='INSERT' OR OLD.status<>'failed')). event_type: `payment_failed`. Body: amount, reason, user phone, provider.
- `trg_notify_subscription_request` — AFTER INSERT on `subscription_requests`. event_type: `sub_request`. Title: `📥 Manual subscription request`. Body: user phone, plan name, txn_id, payment_method।
- `trg_notify_transfer_request` — AFTER INSERT on `shop_transfer_requests`. event_type: `transfer_request`. Body: shop name, from→to phone, charge, method।
- `trg_notify_transfer_proof_uploaded` — AFTER UPDATE on `shop_transfer_requests` WHEN OLD.payment_proof_url IS NULL AND NEW.payment_proof_url IS NOT NULL. event_type: `transfer_proof`.

প্রতিটায় link বসাবে relevant admin page-এ:
- `payment_paid`/`payment_failed` → `/admin/payment-attempts`
- `sub_request` → `/admin/subscription-requests`
- `transfer_request`/`transfer_proof` → `/admin/transfers`

### ২. UI — TelegramAlerts page

`src/pages/admin/TelegramAlerts.tsx`-এ EVENT_OPTIONS array-এ নতুন items যোগ:

```ts
{ key: "all", label: "সব" },
{ key: "payment_paid", label: "💰 পেমেন্ট সফল" },
{ key: "payment_failed", label: "❌ পেমেন্ট ব্যর্থ" },
{ key: "sub_request", label: "📥 Subscription request" },
{ key: "transfer_request", label: "🏪 Shop transfer request" },
{ key: "transfer_proof", label: "💳 Transfer proof uploaded" },
{ key: "order", label: "🛒 নতুন অর্ডার" },
{ key: "fordo", label: "নতুন ফর্দ" },
{ key: "signup", label: "নতুন সাইনআপ" },
```

`telegram-notify` edge function-এর fan-out logic ইতিমধ্যে event_type filter করে — কোন change লাগবে না।

### ৩. Files

**Migration (নতুন):**
- `supabase/migrations/<timestamp>_admin_revenue_telegram_alerts.sql` — উপরের ৫টা trigger function ও triggers।

**Edit:**
- `src/pages/admin/TelegramAlerts.tsx` — EVENT_OPTIONS list extend।

কোনো edge function পরিবর্তন লাগবে না, কোনো নতুন secret লাগবে না (existing telegram_dispatch_settings reuse)। Approve করলে migration আগে run হবে।