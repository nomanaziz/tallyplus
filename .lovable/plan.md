## লক্ষ্য (Goals)

মোবাইল ভার্সনে ড্যাশবোর্ড আরও সংক্ষিপ্ত ও পরিচ্ছন্ন করা, বড় hero banner সরানো, এবং admin-controlled multi-banner system যোগ করা। সাথে web sidebar আরও চিকন করা।

---

## ১. ড্যাশবোর্ড — মোবাইলে সংক্ষিপ্ত হিসাব

`src/routes/app.dashboard.tsx`-এ পরিবর্তন:

- **স্টাট টাইলগুলো সংক্ষিপ্ত করা** — মোবাইলে এখন ৬টা বড় কার্ড ২ কলামে। নতুন layout:
  - একটি compact "summary card" যেখানে: ব্যালেন্স, আজকের বিক্রি, আজকের খরচ, বাকি (দিয়েছি/নিয়েছি), স্টক সংখ্যা — সবকিছু একটা border-শেয়ার করা গ্রিডে (uploaded screenshot-এর মতো hishabee style)।
  - মোবাইলে: 3 কলামে compact rows, ছোট label + ছোট value।
  - Desktop-এ: আগের মতো বড় টাইল রাখব (md:grid-cols-3)।
- **Range tabs সরল করা** — মোবাইলে শুধু "দিন / মাস" toggle (screenshot-এর মতো); week/year/all টাইল desktop-এ দেখাব।
- **"মোবাইল ভিউ" Switch সরানো** — অপ্রয়োজনীয়।

## ২. বড় Hero Banner সরিয়ে Admin-Controlled Banner Carousel

বর্তমান hard-coded "এক ক্লিকেই হিসাব পরিষ্কার" banner সম্পূর্ণ সরানো হবে।

### ডেটাবেস
নতুন table `dashboard_banners`:
- `id`, `image_url`, `title_bn`, `title_en`, `link_url` (optional), `sort_order`, `is_active`, `created_at`, `updated_at`
- RLS: public read (active only), admin-only write (`is_admin(auth.uid())`)
- Trigger: auto `updated_at`

### Frontend
`src/routes/app.dashboard.tsx`-এ একটা ছোট auto-rotating carousel (Embla / shadcn Carousel — already available)। Admin ২–৩ টা banner add করলে rotate হবে। কোনো banner না থাকলে সম্পূর্ণ section render হবে না।
- মোবাইলে height ~120px, dot indicators।
- Desktop-এ height ~160px।

### Admin UI
নতুন route `src/routes/admin.banners.tsx`:
- Banner list (image preview, title, sort, active toggle)
- Add/Edit dialog: image upload (Supabase Storage bucket `dashboard-banners`), title bn/en, link, sort, active
- Delete button
- AdminSidebar-এ "Dashboard Banners" link যোগ

Storage bucket `dashboard-banners` (public read, admin write) migration-এ create।

## ৩. মোবাইল মেনু — সব Sidebar Link হ্যামবার্গারে

বর্তমান mobile hamburger ইতিমধ্যে `AppSidebar` রেন্ডার করে — যেটায় সব link আছে (Purchase, Sell, Cashbox, Ledgers, Contacts, Training, Affiliate, Products, Stock, Access, Printer, Reports, Marketing, Online Shop, Wishlist, Expiring, Warranty, Recycle Bin)। 

কিন্তু ব্যবহারকারী বলছেন মেনু "উঠায়ে দিছে" — সম্ভবত আরও visible/grouped করা দরকার। পরিবর্তন:
- `AppSidebar`-এ items গুলো section header দিয়ে গ্রুপ করব (খাতাসমূহ / ব্যবসা / অন্যান্য) যাতে মোবাইলে scan করা সহজ হয়।
- Mobile hamburger sheet-এ AppSidebar full-height scroll-able থাকবে — সব ২২+ link visible।

## ৪. Web Sidebar আরও চিকন

`src/components/app/AppSidebar.tsx`:
- Width `w-60` (240px) → `w-52` (208px)
- Padding ও icon size সামান্য কমানো (h-6 w-6 → h-5 w-5)
- Font size text-sm রাখা, line-height tight
- `src/routes/app.tsx`-এ sidebar wrapper-এর সাথে align

---

## টেকনিক্যাল সারাংশ (Technical)

**Files to create:**
- `supabase/migrations/<ts>_dashboard_banners.sql` — table + RLS + trigger + storage bucket
- `src/routes/admin.banners.tsx` — admin CRUD UI
- `src/components/app/DashboardBannerCarousel.tsx` — frontend carousel

**Files to edit:**
- `src/routes/app.dashboard.tsx` — remove hero banner, compact stats grid, mobile-first day/month toggle, mount banner carousel, remove "Mobile view" switch
- `src/components/app/AppSidebar.tsx` — slim width, grouped sections, smaller icons
- `src/components/admin/AdminSidebar.tsx` — add "Dashboard Banners" link
- `src/integrations/supabase/types.ts` — regenerate types for new table

**Storage:** Supabase Storage bucket `dashboard-banners` (public read, admin upload via signed policy)।

**Carousel library:** existing `embla-carousel-react` via `src/components/ui/carousel.tsx`।

---

## অ্যাপ্রুভ করলে আমি:
1. Migration বানিয়ে database পরিবর্তন approval চাইব
2. Admin Banners CRUD page তৈরি করব
3. Dashboard refactor করব (compact stats + carousel + banner সরানো)
4. Sidebar slim ও grouped করব