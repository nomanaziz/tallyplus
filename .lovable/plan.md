
# Admin Portal — Prototype Plan

## ১. Security cleanup

- `src/routes/admin.setup.tsx` ফাইল delete করব।
- `supabase/functions/bootstrap-admin/` edge function delete করব।
- `supabase/config.toml` থেকে `[functions.bootstrap-admin]` block remove করব।
- `src/routes/admin.login.tsx` থেকে "Super admin তৈরি করুন" link remove করব।
- ভবিষ্যতে নতুন admin শুধু existing admin dashboard থেকে promote করা যাবে (নিচের Users section-এ "Make admin" action)।

## ২. Admin Dashboard layout (নতুন structure)

`/admin` route-এ একটা proper sidebar layout বানাব (shop owner dashboard-এর মতো) — left sidebar + top bar + content area।

```text
┌─────────────────────────────────────────────────────┐
│  [Logo] Admin Portal              [admin@..] [Out]  │
├──────────┬──────────────────────────────────────────┤
│ Overview │                                          │
│ Landing  │     Selected page content                │
│ Users    │                                          │
│ Subs     │                                          │
│ Plans    │                                          │
│ Market   │                                          │
│ Settings │                                          │
└──────────┴──────────────────────────────────────────┘
```

নতুন routes:
- `/admin` — Overview (KPI cards: total users, active subs, pending requests, MRR)
- `/admin/landing` — Landing page CMS
- `/admin/users` — User list & management
- `/admin/subscriptions` — All subscriptions
- `/admin/subscription-requests` — Pending payment proof approvals
- `/admin/plans` — Subscription plan editor
- `/admin/marketplace` — Marketplace product/seller moderation
- `/admin/settings` — Site-wide settings

প্রতিটা route admin role guard দিয়ে protect থাকবে (shared `<AdminLayout>` component-এ একবার check)।

## ৩. Landing page CMS (section-by-section edit)

বর্তমানে landing page-এর প্রতিটা section (Hero, Features, Pain, Compare, BusinessTypes, Testimonials, Pricing, Contact, Stats, FinalCta) hard-coded। এগুলোকে database-driven করব যাতে admin আলাদা আলাদা section edit করতে পারে।

### Database
নতুন table `public.site_content`:
- `id uuid pk`
- `section text unique` — যেমন `hero`, `features`, `pain`, `compare`, `business_types`, `testimonials`, `pricing_intro`, `contact`, `stats`, `final_cta`, `footer`
- `data jsonb` — section-specific structured content (bn + en)
- `is_published boolean default true`
- `updated_at`, `updated_by uuid`

RLS:
- Public SELECT (landing page সবাই দেখবে)
- INSERT/UPDATE/DELETE শুধু `is_admin(auth.uid())`

Seed migration প্রতিটা section-এর current hard-coded value JSON হিসেবে insert করবে যাতে landing page break না করে।

### Admin UI (`/admin/landing`)
- Section list view (cards: "Hero", "Features", ইত্যাদি — last updated time সহ)
- প্রতিটা section-এ edit button → dedicated drawer/dialog যেখানে fields edit করা যাবে (যেমন Hero-এর জন্য: tagline, title bn/en, subtitle, CTA text, stats numbers; Features-এর জন্য: rows array — প্রতিটা row-এ icon, title, desc, bullet points add/remove/reorder)
- Save → `site_content` update + toast
- "Preview" button → নতুন tab-এ `/` open
- প্রতিটা section toggle: Published / Hidden

### Public site changes
Landing page components গুলো `useSiteContent(section)` hook দিয়ে data fetch করবে; fallback হিসেবে current hard-coded copy থাকবে যাতে CMS empty থাকলেও সাইট ভাঙবে না।

## ৪. User management (`/admin/users`)

### User types আমরা কীভাবে represent করব

আপনার বর্ণনা অনুযায়ী ৩ ধরনের user:
1. **Shop owner / দোকানদার (seller)** — `profiles` + `shops` থাকা user (existing)
2. **Buyer / খরিদ্দার / গ্রাহক** — শুধু গ্রাহক হিসেবে ফর্দ submit করে (নতুন; এখন anonymous, আমরা optional account দেব)
3. **Admin** — `user_roles.role = 'admin'`

`app_role` enum-এ `'buyer'` add করব (existing `owner`, `cashier`, `admin` ইতিমধ্যে আছে)। Profile-এ user type derive করা হবে: যদি কোন `shops.owner_id` থাকে → seller; যদি শুধু wishlist submit করে থাকে → buyer; user_roles-এ admin থাকলে → admin।

### UI features
- Filterable table: search (name/phone/email), filter by type (Owner / Buyer / Admin / Suspended), sort by created date
- প্রতিটা row-এ: avatar, name, phone, type badge, shops count, active sub status, joined date
- Row actions:
  - View details (drawer): profile, shops, subscriptions, recent activity
  - Suspend / Unsuspend (`profiles.is_suspended` already exists)
  - Promote to admin / Revoke admin (manage `user_roles`)
  - Send notification (uses existing `notifications` table)

## ৫. Subscription & Plan management

### `/admin/plans`
- Existing `subscription_plans` table-এর CRUD
- Fields: code, name_bn, name_en, price_bdt, duration_days, is_active
- New plan add, edit, deactivate

### `/admin/subscription-requests`
- Pending `subscription_requests` list with payment proof image preview
- Approve → create `subscriptions` row (active, expires_at = now + plan.duration_days), update request status
- Reject → set status + admin_note

### `/admin/subscriptions`
- Active subscriptions list, filter by plan / status / expiring soon
- Manual extend, cancel, refund-note

## ৬. Marketplace (foundation prototype)

আপনার vision: একই product (যেমন "এক পাতা চা") অনেক seller list করতে পারে। Customer product দেখে, তারপর seller list filter (Division/District/Upazila) করে কিনে।

### Database — নতুন tables

**`public.marketplace_products`** (canonical / shared product catalog)
- `id, name_bn, name_en, slug unique, description, image_url, category, base_unit, created_by_admin uuid, is_active, created_at`
- শুধু admin এই canonical list manage করবে যাতে duplicate ছবি/নাম না হয়।

**`public.marketplace_listings`** (per-seller listing)
- `id, product_id → marketplace_products, shop_id → shops, seller_id → profiles, price, stock, unit, min_order, is_published, created_at`
- "অনলাইনে বিক্রি করুন" button click করলে owner-এর shop product → এখানে listing হিসেবে যোগ হবে।

**`public.seller_locations`** (filter-এর জন্য)
- `shop_id → shops (pk), division, district, upazila, lat, lng`
- Cascade delete shop সাথে।

**Public marketplace pages** (admin scope-এর বাইরে কিন্তু foundation এই plan-এ):
- `/market` — product grid
- `/market/$slug` — single product page + sellers list with Division/District filter

### `/admin/marketplace`
Admin panel-এ ৩ tab:
1. **Products** — canonical product CRUD (add new, edit name/image/category, deactivate)
2. **Listings** — সব seller listing (filter by product/seller/status), unpublish abusive listing
3. **Sellers** — seller location data, verification badge toggle

## ৭. Folder feature (Seller → Seller monthly basket)

আপনি বলেছেন: একজন seller একটা folder/মাসিক বাজার তৈরি করে অন্য seller-কে send করতে পারবে; receiver accept/partial accept করতে পারবে।

এটা scope-wise বড়। Prototype-এ আমরা শুধু:
- Database schema design করব (`seller_baskets`, `seller_basket_items`, `basket_transfers` with status: pending/accepted/partial/rejected)
- `/admin/marketplace` থেকে admin সব transfer দেখতে পারবে (read-only oversight)
- Actual seller-facing UI পরবর্তী iteration-এ আসবে

এতে confirm করতে চাই — চান কি এই folder/transfer feature-এর full seller UI এই round-এই বানাই, নাকি শুধু schema + admin oversight এই round-এ যথেষ্ট?

## Technical details

- নতুন routes: `admin.tsx` (layout with sidebar + auth guard), `admin.landing.tsx`, `admin.users.tsx`, `admin.subscriptions.tsx`, `admin.subscription-requests.tsx`, `admin.plans.tsx`, `admin.marketplace.tsx`, `admin.settings.tsx`
- Existing `admin.index.tsx` কে Overview page হিসেবে rewrite করব (KPI cards)
- নতুন components: `AdminSidebar`, `AdminTopbar`, `SectionEditorDrawer`, `UserDetailsDrawer`, `MarketplaceProductDialog`
- নতুন hooks: `useSiteContent(section)` — TanStack Query দিয়ে cache করবে; admin mutation invalidate করবে
- Migrations: `site_content` table + seed, `marketplace_products`, `marketplace_listings`, `seller_locations`, `app_role` enum-এ `'buyer'` add, optional basket schema
- Edge function লাগবে না — সব RLS-protected client query দিয়ে চলবে (admin role check RLS-এ আছে)

## Out of scope (এই round-এ না)

- Public `/market` storefront (পরে)
- Seller folder/basket UI (নিচের প্রশ্ন approve হলে)
- Email/SMS notification থেকে user-কে — পরবর্তী iteration

---

**দয়া করে confirm করুন:**
1. Folder/basket transfer feature — শুধু schema + admin oversight, নাকি full seller UI সহ?
2. Public marketplace `/market` page — এই round-এ চান নাকি পরে?
