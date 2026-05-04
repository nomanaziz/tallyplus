## Goal

Personal account (consumer) এর left sidebar-এ যে menu items missing সেগুলো add করা, এবং dashboard-এ আরও বেশি information (দেনা, পাওনা, total order, favourite shops, services ইত্যাদি) দেখানো।

## Current state

**Sidebar (`CustomerLayout.tsx`)** এ এখন মাত্র ৬টি item আছে:
Dashboard, আমার ফর্দ, আমার অর্ডার, আমার সার্ভিস, প্রিয় দোকান, প্রোফাইল।

কিন্তু পেজ আছে আরও অনেক — **Money (আয়-ব্যয়), Notes (নোট), Training (ট্রেনিং), Create Fordo (নতুন ফর্দ)** — এগুলো sidebar-এ নেই, তাই desktop থেকে directly access করা যাচ্ছে না (শুধু dashboard shortcut থেকে)।

**Dashboard** এখন দেখায়: এ-মাসের আয়/ব্যয়/ব্যালেন্স + ৯টা shortcut tile (যার মধ্যে পাব/দেব শুধু amount দেখায়)। কিন্তু total orders, favourite shops count, my services count — এসব নেই।

## Changes

### 1. Sidebar এ missing menu add করা (`src/pages/customer/CustomerLayout.tsx`)

`NAV` array টা update করে নতুন order:

```text
- ড্যাশবোর্ড          (Home)
- আমার ফর্দ           (ListChecks)
- নতুন ফর্দ তৈরি করুন   (Plus)        ← নতুন
- আমার অর্ডার          (ShoppingBag)
- আমার সার্ভিস         (Wrench)
- প্রিয় দোকান         (Heart)
- আয়-ব্যয়            (Wallet)       ← নতুন
- নোট                (StickyNote)   ← নতুন
- ট্রেনিং             (GraduationCap)← নতুন
- প্রোফাইল            (User)
```

Mobile bottom nav-এ ১০টা item দেখানো ঠিক হবে না (এখন `grid-cols-6`)। Mobile-এ ৫টা most important রাখব: Dashboard, আমার ফর্দ, আমার অর্ডার, আয়-ব্যয়, প্রোফাইল — `grid-cols-5`। বাকিগুলো dashboard shortcuts + desktop sidebar থেকে access হবে।

### 2. Dashboard-এ আরও information add করা (`src/pages/customer/Dashboard.tsx`)

বর্তমান ৩টা summary card (আয়/ব্যয়/ব্যালেন্স) এর নিচে একটা নতুন **"মোট সারসংক্ষেপ"** section add করব ৬টা compact stat card সহ:

```text
┌─────────────────────────────────────────────────────────┐
│  পাব          দেব          মোট অর্ডার                  │
│  ৳ 1,200      ৳ 500        12টি                        │
├─────────────────────────────────────────────────────────┤
│  আমার ফর্দ    প্রিয় দোকান   সার্ভিস বুকিং              │
│  3টি         2টি           1টি                         │
└─────────────────────────────────────────────────────────┘
```

Data sources (সব Promise.all-এ একসাথে fetch হবে, hook সবই আগে থেকেই আছে):

- **পাব / দেব** — `consumer_loans` (already fetched, just promote into prominent cards)
- **মোট অর্ডার** — `marketplace_orders` count where `customer_user_id = user.id`
- **আমার ফর্দ** — already counted (`fordoCount`)
- **প্রিয় দোকান** — `consumer_favourite_shops` count where `user_id = user.id`
- **সার্ভিস বুকিং** — `service_bookings` count where `customer_user_id = user.id` (যদি table থাকে; না-থাকলে skip)

এর নিচেই বর্তমান ৯টা shortcut tile section আগের মতই থাকবে (quick access হিসেবে কাজ করবে), শুধু "পাব"/"দেব" tile দুটো remove করব কারণ সেগুলো এখন উপরের stat row-তে আরও prominent ভাবে দেখা যাচ্ছে।

### 3. কোনো DB / migration লাগবে না

সব table আর data এক্সিস্ট করে — শুধু frontend-এ query + UI add।

## Out of scope

- Sidebar collapse/mini-variant — বর্তমান layout sticky sidebar (220px) ব্যবহার করছে, এটা পরিবর্তন করা হচ্ছে না।
- নতুন কোনো consumer feature page তৈরি হচ্ছে না — শুধু existing pages গুলোকে discoverable করা হচ্ছে।
