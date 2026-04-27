## কাজের পরিধি

গ্রাহক পোর্টালে দুটো বড় পরিবর্তন + শপের জন্য বাংলাদেশের প্রশাসনিক ঠিকানা সিস্টেম + অ্যাডমিন কন্ট্রোল।

---

## ১) আয়-ব্যয়: আলাদা বাটন ও বাংলা ক্যাটাগরি

**বর্তমান:** একটাই "যোগ করুন" বাটন, sheet এর ভিতরে tabs।

**পরিবর্তন (`src/pages/customer/Money.tsx`):**

- "যোগ করুন" বাটন সরিয়ে দুটো আলাদা বাটন:
  - 🟢 **আয় (+)** — সবুজ, plus icon
  - 🔴 **ব্যয় (−)** — লাল, minus icon
- বাটন চাপলে sheet সরাসরি correct mode এ খুলবে (tab toggle আর দেখাবে না)।

**ক্যাটাগরি বাড়ানো:**

আয়:
- বেতন, ব্যবসার আয়, ফ্রিল্যান্স/পার্ট-টাইম, উপহার, বোনাস, বিনিয়োগ থেকে আয়, ভাড়া আয়, ভাতা/পেনশন, ধার ফেরত পেলাম, অন্যান্য।

ব্যয়:
- বাজার/খাবার, বাসা ভাড়া, ইউটিলিটি বিল (গ্যাস/বিদ্যুৎ/পানি), ইন্টারনেট/মোবাইল, যাতায়াত, চিকিৎসা, শিক্ষা/পড়াশোনা, পোশাক, বিনোদন, দান/সদকাহ, ঋণ পরিশোধ, সঞ্চয়/বিনিয়োগ, ব্যবসায়িক খরচ, অন্যান্য।

---

## ২) গ্রাহক পোর্টালে "ফর্দ তৈরি করুন" এবং দোকানে পাঠানো

**বর্তমান:** MyFordo শুধু পাঠানো ফর্দ list করে। গ্রাহক ভিতর থেকে নতুন ফর্দ তৈরি/পাঠাতে পারে না।

**নতুন flow:**

`src/pages/customer/MyFordo.tsx` এ উপরে **"+ নতুন ফর্দ তৈরি করুন"** বাটন।

```text
┌─ Step 1: Items ─────────────────────────────┐
│  পণ্য যোগ করুন (নাম, পরিমাণ, একক)            │
│  [+ আরও যোগ করুন]                            │
│  নোট (ইচ্ছাধীন)                              │
│                            [পরবর্তী →]      │
└──────────────────────────────────────────────┘
                  ↓
┌─ Step 2: Send to ───────────────────────────┐
│  কোন দোকানে পাঠাবেন?                         │
│                                              │
│  ▸ মোবাইল নম্বর দিয়ে খুঁজুন                 │
│    [01XXXXXXXXX]              [খুঁজুন]      │
│                                              │
│  ▸ অথবা দোকানের নাম দিয়ে খুঁজুন             │
│    [দোকানের নাম...]                          │
│                                              │
│  ▸ আমার এলাকার দোকান (default)              │
│    গ্রাহকের present address থেকে              │
│    division/district/upazila ম্যাচ করে        │
│    শপ list — কাছেরটা সবার আগে।                │
└──────────────────────────────────────────────┘
                  ↓
   মালিকের একাধিক দোকান হলে → শপ select dropdown
                  ↓
              [পাঠান]
                  ↓
   customer_wishlists এ insert (consumer_user_id সহ)
```

**Backend:** নতুন edge function `customer-create-wishlist` যেটা logged-in consumer থেকে wishlist + items insert করবে (RLS-friendly, service role দিয়ে)।

**Shop search by phone:** নতুন edge function `find-shops-by-phone` — `shops.phone` অথবা owner profile.phone এর সাথে match করে publicly published (marketplace_enabled) shops list দেবে। যদি একই ফোনে একাধিক শপ থাকে — সবগুলো return করবে যাতে গ্রাহক select করতে পারে।

---

## ৩) দোকানের বাংলাদেশি ঠিকানা (Division / District / Upazila / Area)

**ইতিমধ্যে আছে:** `seller_locations` (shop_id, division, district, upazila, lat, lng) এবং `AddShopDialog.tsx` এ hard-coded BD_DIVISIONS/DISTRICTS।

**সমস্যা:** Hard-coded — admin update করতে পারে না, upazila নেই, mandatory নয়।

### ডাটাবেজ পরিবর্তন

নতুন reference tables (admin-managed):

- `bd_divisions` (id, name_bn, name_en, code, is_active, sort_order)
- `bd_districts` (id, division_id, name_bn, name_en, code, is_active)
- `bd_upazilas` (id, district_id, name_bn, name_en, code, is_active)

Migration এ বাংলাদেশের সব 8 division, 64 district, ~495 upazila seed করা হবে (Bengali + English নাম)।

`shops` টেবিলে field optional হলেও — frontend mandatory:
- `seller_locations` ইতিমধ্যে আছে — শুধু নতুন column যোগ: `area text` (নির্দিষ্ট পাড়া/মহল্লা — free text)।
- `consumer_profiles` এ যোগ: `division text`, `district text`, `upazila text`, `area text` (গ্রাহকের present address)।

**RLS:**
- `bd_*` tables — public read, admin write।
- `seller_locations` — already protected।

### Frontend পরিবর্তন

**শপ মালিকের জন্য:**
- `AddShopDialog.tsx` এবং `EditShopDialog`/Settings: hard-coded list সরিয়ে DB থেকে cascading dropdown (Division → District → Upazila), শেষে free-text "Area/মহল্লা" field। সব mandatory।
- Signup এর সাথে শপ create এর সময়েও এই fields collect করবে (`signup-with-pin` edge function update)।

**গ্রাহকের জন্য (`/customer/profile`):**
- "আমার ঠিকানা" section: Division → District → Upazila cascading dropdown + Area free-text। Save করলে `consumer_profiles` এ যাবে।
- প্রথম login এ যদি address খালি থাকে — Profile pop up করে fill out করতে বলবে (soft prompt)।

**ফর্দ পাঠানোর সময়:**
- Default: গ্রাহকের saved address থেকে nearest shops first (same upazila > same district > same division > others)।
- Search by phone / shop name হিসেবে override।

### অ্যাডমিন কন্ট্রোল প্যানেল

নতুন route: **`/admin/locations`** (`src/pages/admin/Locations.tsx`)
- Division list (toggle is_active) → expand করে Districts → expand করে Upazilas।
- প্রতিটাতে: সম্পাদনা (নাম bn/en), Active/Inactive toggle।
- "is_active = false" হলে শপ মালিক/গ্রাহক ওই জেলা দেখতে পারবে না (admin "এই জেলায় খুলতে দিবে না" control)।
- Sidebar এ "এলাকা সেটিংস (Locations)" link যোগ।

---

## কারিগরি ফাইল list

**Database migration:**
- `bd_divisions`, `bd_districts`, `bd_upazilas` create + seed
- `consumer_profiles`: division/district/upazila/area columns add
- `seller_locations`: area column add
- RLS policies

**Frontend:**
- `src/pages/customer/Money.tsx` — আয়/ব্যয় আলাদা বাটন + extended categories
- `src/pages/customer/MyFordo.tsx` — "নতুন ফর্দ" বাটন
- `src/pages/customer/CreateFordo.tsx` (নতুন) — 2-step wizard
- `src/pages/customer/Profile.tsx` — address section
- `src/components/shared/BdLocationPicker.tsx` (নতুন) — reusable cascading picker
- `src/components/app/AddShopDialog.tsx` — DB-driven location picker, mandatory
- `src/pages/admin/Locations.tsx` (নতুন) — admin control panel
- `src/components/admin/AdminSidebar.tsx` — Locations link
- `src/routes.tsx` — নতুন routes

**Edge functions:**
- `customer-create-wishlist` (নতুন) — consumer-authenticated wishlist creation
- `find-shops-by-phone` (নতুন) — shop discovery by phone
- `signup-with-pin` (update) — collect division/district/upazila/area

## ফলাফল

- ✅ আয়/ব্যয় আলাদা বাটন, বিস্তৃত বাংলা ক্যাটাগরি
- ✅ গ্রাহক পোর্টাল থেকেই ফর্দ তৈরি ও যেকোনো শপে পাঠানো (ফোন/নাম/এলাকা দিয়ে)
- ✅ একই owner এর multiple shop থাকলে select করার option
- ✅ Cascading BD location picker সর্বত্র
- ✅ গ্রাহকের present address অনুযায়ী নিয়ারেস্ট দোকান priority
- ✅ অ্যাডমিন division/district/upazila enable/disable করতে পারবে
