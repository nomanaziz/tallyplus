# Admin Telegram Notification System

Admin সবসময় online থাকে না — তাই গুরুত্বপূর্ণ event (নতুন order, ফর্দ submission, user signup, ইত্যাদি) Telegram-এ instant push হবে।

## কিভাবে কাজ করবে (high level)

```
[App event: order/ফর্দ/signup]
        ↓
[Supabase trigger / server-fn] → notify_admin_telegram()
        ↓
[Telegram connector gateway] → admin-এর Telegram chat
```

## যা যা লাগবে আপনার থেকে

### Step 1 — Telegram Bot তৈরি করুন
1. Telegram-এ `@BotFather` খুলুন
2. `/newbot` লিখে পাঠান
3. Bot এর নাম দিন (যেমন: `TallyPlus Admin Alerts`)
4. Username দিন (যেমন: `tallyplus_admin_bot`)
5. BotFather একটা **token** দিবে — এটা পরে কাজে লাগবে

### Step 2 — Admin chat ID বের করুন
1. নিজের নতুন bot-কে Telegram-এ search করে `/start` চাপুন
2. Browser-এ যান: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Response-এ `"chat":{"id": 123456789}` — এই number আপনার **chat ID**
4. (একাধিক admin চাইলে group তৈরি করে bot add করুন, group এর negative chat ID use হবে)

### Step 3 — Lovable-এ Telegram connector connect করুন
আমি plan approve হলে `Telegram` connector-এ connect করার flow দেখাবো — শুধু bot token দিতে হবে। Token সরাসরি code-এ যাবে না, secure storage-এ থাকবে।

---

## আমি যা build করবো (approve হলে)

### 1. Database
- `admin_telegram_subscribers` table: `chat_id`, `label`, `is_active`, `events[]` (কোন কোন event পাবে — `order`, `fordo`, `signup`, `payment`, `all`)
- RLS: শুধু super-admin manage করতে পারবে

### 2. Notification dispatch
- **Server route** `/api/public/hooks/telegram-notify` (signature-verified) — Telegram gateway-এ message পাঠাবে
- **DB trigger** orders, ফর্দ submissions, signups টেবিলে — pg_net দিয়ে উপরের endpoint hit করবে
- Bangla message format with emoji:
  ```
  🛒 নতুন অর্ডার
  গ্রাহক: রহিম মিয়া
  পরিমাণ: ৳১২৫০
  Items: ৫টি
  Time: ৭:৩০ PM
  [View →]
  ```

### 3. Admin UI — `/admin/notifications`
- Telegram subscriber list (add/remove chat ID)
- Per-event toggle (order alerts, fordo alerts, signup alerts, payment alerts)
- "Send test message" button
- Setup guide modal (BotFather steps উপরের মতো)

### 4. Events covered (Phase 1)
- নতুন order placed
- নতুন ফর্দ created (image-fordo সহ)
- নতুন user signup
- Loan/EMI overdue (existing reminder system থেকে)

পরে চাইলে: low stock alert, payment received, daily summary digest যোগ করা যাবে।

---

## আপনার এখনকার action items

1. ✅ BotFather থেকে bot বানিয়ে token নিন
2. ✅ নিজের chat ID বের করুন
3. ✅ এই plan approve করুন → আমি connector setup + code + UI সব করে দিবো
4. Approve-এর পর আমি Telegram connector connect করতে বলবো — সেখানে token দিবেন

কোনো event এই Phase 1-এ বাদ পড়েছে যেটা চান, বলুন।
