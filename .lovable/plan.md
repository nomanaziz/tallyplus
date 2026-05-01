## যা যা যোগ করতে হবে

### 1️⃣ ফর্দ থেকে Expense এ এক ক্লিকে যোগ করা
গ্রাহকের "আমার ফর্দ" পেজে প্রতিটি ফর্দ card এ একটি নতুন বোতাম **"💸 খরচে যোগ করুন"** থাকবে (যখন total > 0)। চাপলে ফর্দের total টাকা ক্যাটাগরি "বাজার/খাবার", note এ "ফর্দ থেকে: <দোকানের নাম>" দিয়ে `consumer_transactions` এ একটা expense entry হিসেবে save হবে। একই ফর্দ যাতে দু'বার add না হয় সেজন্য টেবিলে একটি `source_wishlist_id` কলাম থাকবে — duplicate checked।

### 2️⃣ দেনা-পাওনা (Loans/Debts)
নতুন টেবিল `consumer_loans` — গ্রাহক track করতে পারবে:
- **পাওনা (lent)**: কাকে কত টাকা ধার দিয়েছে
- **দেনা (borrowed)**: কারো কাছে কত টাকা ঋণ
- প্রতিটি entry তে: party_name, phone, amount, type (lent/borrowed), date, due_date, note, is_settled, settled_at

আয়-ব্যয় পেজে নতুন একটা **"দেনা-পাওনা"** tab। উপরে summary tiles: "পাব ৳X • দেব ৳Y • নিট ৳(X-Y)"। List এ unsettled গুলো highlighted, settle বোতামে চাপলে date সহ closed হয়। Settle করলে চাইলে স্বয়ংক্রিয়ভাবে income/expense entry তৈরি হবে।

### 3️⃣ Monthly History + Subscription gating

**বর্তমান page পরিবর্তন:**
- উপরে month picker — default current month
- "এই মাস" → পূর্ণ details (transactions list + summary)
- পূর্বের ১ মাস + আরও পূর্বের ১ মাস (মোট আগের ৩ মাস current সহ) → **detailed access**
- ৩ মাসের পূর্বের যেকোনো মাস → শুধু **summary** (total income/expense/balance) দেখা যাবে; বিস্তারিত list দেখতে চাইলে subscription dialog খুলবে

**নতুন subscription plans (consumer-targeted):**
DB তে `subscription_plans` এ ৩টি নতুন consumer plan add হবে — `code` field দিয়ে identify:
- `consumer_history_1y` — পূর্বের ১ বছরের বিস্তারিত access
- `consumer_history_5y` — পূর্বের ৫ বছর
- `consumer_history_10y` — পূর্বের ১০ বছর

এগুলো বিদ্যমান `subscriptions` table reuse করবে। Access check helper: `canAccessMonth(monthDate, sub)` — current/prev-2 সবসময় free, এর আগের range subscription duration অনুযায়ী determine।

**Subscription kনা flow:** existing payment flow (যেটা owner-side use হয়) reuse — admin manually approve করবে `subscription_requests` দিয়ে (ইতিমধ্যে আছে)।

### 4️⃣ Customer Dashboard tile update
"আয়-ব্যয়" tile এ এই মাসের নিট (income - expense) দেখাবে এবং পাশে "দেনা-পাওনা" mini stat।

---

## Technical breakdown

**Database migrations:**
1. `consumer_transactions` এ `source_wishlist_id uuid` কলাম যোগ + unique index `(user_id, source_wishlist_id)` যেখানে non-null
2. নতুন `consumer_loans` table:
   - কলাম: id, user_id, party_name, party_phone, type (enum: 'lent'|'borrowed'), amount, loan_date, due_date, note, is_settled, settled_at
   - RLS: user নিজের record দেখতে/insert/update/delete করতে পারবে
   - trigger: tg_set_updated_at
3. `subscription_plans` এ ৩টি নতুন row insert (code: consumer_history_1y/5y/10y)

**Frontend changes:**
- `src/pages/customer/MyFordo.tsx` — ফর্দ card এ "খরচে যোগ" বোতাম, duplicate-prevention
- `src/pages/customer/Money.tsx` — Tabs: "আয়-ব্যয়" / "দেনা-পাওনা"; month picker; subscription gating UI
- নতুন `src/components/customer/LoansTab.tsx` — দেনা-পাওনা UI
- নতুন `src/lib/consumer-history-access.ts` — month access logic helper
- `src/pages/customer/Dashboard.tsx` — tile update

**Files to create/modify (~7 files):**
- 1 migration (3 schema changes)
- Modified: MyFordo.tsx, Money.tsx, Dashboard.tsx
- Created: LoansTab.tsx, consumer-history-access.ts, MonthPicker component
