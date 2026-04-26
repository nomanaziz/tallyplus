## ফর্দ History (গ্রাহক ইতিহাস) — Plan

### লক্ষ্য
দোকানদার নাম বা মোবাইল নম্বর দিয়ে search করে দেখতে পারবেন — কোন গ্রাহক কোন তারিখে কী কী কিনেছিলেন (ফর্দ পাঠিয়েছিলেন)। আলাদা গ্রাহকের কোনো sensitive data রাখা হবে না — শুধু **নাম + ফোন** এবং তাদের পুরোনো ফর্দগুলো।

---

### Approach
নতুন কোনো customer table দরকার নেই — `customer_wishlists` টেবিলেই ইতিমধ্যে `customer_name`, `customer_phone`, `shop_id`, `created_at` আছে এবং `customer_wishlist_items`-এ items আছে। আমরা এই data কে দুইটা view-এ গুছিয়ে দেখাবো।

---

### What will be built

**1. New route: `/app/fordo-history` (ফর্দ ইতিহাস)**

দুইটা tab:

- **Tab 1: গ্রাহক তালিকা (Customer List)**
  - Search box: নাম বা মোবাইল নম্বর
  - প্রতিটি গ্রাহকের জন্য একটি card:
    - নাম, মোবাইল নম্বর
    - মোট ফর্দ সংখ্যা
    - সর্বশেষ ফর্দের তারিখ
    - মোট আনুমানিক খরচ (items × price যেখানে আছে)
  - Card-এ click করলে → ওই গ্রাহকের সব ফর্দ মাস অনুযায়ী group করে দেখাবে

- **Tab 2: সব ফর্দ (All Fordos — timeline)**
  - মাস filter (এপ্রিল ২০২৬, মার্চ ২০২৬…)
  - Search (নাম/ফোন)
  - প্রতিটি ফর্দের সংক্ষিপ্ত preview — গ্রাহকের নাম, ফোন, তারিখ, item count, status
  - Click → বিস্তারিত items সহ dialog

**2. Customer detail view (drill-down)**
যখন কোনো গ্রাহকে click করা হবে:
- উপরে গ্রাহকের নাম + ফোন + WhatsApp/Call button
- নিচে মাস-অনুযায়ী সব ফর্দ — accordion-এ
- প্রতিটি ফর্দের ভিতরে item list (নাম, পরিমাণ, দাম)

**3. Sidebar/Navigation**
- `AppSidebar.tsx`-এ "গ্রাহক ফর্দ"-এর নিচে "ফর্দ ইতিহাস" link যোগ করা হবে

---

### Technical Details

- Route file: `src/routes/app.fordo-history.tsx`
- Data source: existing `customer_wishlists` + `customer_wishlist_items` tables (RLS already restricts to shop members — security ✓)
- Customer aggregation: client-side group-by on `customer_phone` (normalized — trim + last 11 digits) থেকে, যাতে একই ফোনে নাম একটু আলাদা হলেও merge হয়
- Month grouping: `created_at` থেকে `YYYY-MM` key
- Search: debounced, case-insensitive substring match on name + phone
- কোনো নতুন migration লাগবে না — schema পর্যাপ্ত

---

### Files to create/modify
- **Create**: `src/routes/app.fordo-history.tsx`
- **Modify**: `src/components/app/AppSidebar.tsx` (নতুন menu item)

কোনো DB migration বা edge function পরিবর্তন এই কাজে দরকার নেই।