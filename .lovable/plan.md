# Plan: Settings Menu + Affiliate / Growth Partner Program

## Part 1 — Fix the Settings menu (top bar)

Currently the "সেটিংস" button in `AppTopbar.tsx` is a plain `<button>` with no onClick — clicking it does nothing. Convert it into an opening trigger for a right-side `Sheet` that mirrors the screenshot the user shared.

**Component:** new `src/components/app/SettingsSheet.tsx`

Sections (matching the uploaded reference):
- **দোকান পরিবর্তন করুন** — opens existing shop switcher (reuse logic from `useShop`).
- **অ্যাপ সেটিংস** — list rows (each navigates or opens an inline control):
  - কমপ্লিট ড্যাশবোর্ড → `/app/dashboard`
  - সাবস্ক্রিপশন → `/app/subscribe`
  - ভাষা — inline select (bn/en) using `useI18n`
  - কারেন্সি — select (BDT default, persist in localStorage)
  - থিম — Light/Dark toggle (persist)
  - দশমিক পয়েন্ট — 0/2 select (persist)
  - লিমিট চার্ট ও ব্যবহার → placeholder route
  - হিসাবী মোবাইল অ্যাপ → external link
  - অ্যাপ ট্রেনিং → `/app/training`
- **অন্যান্য**
  - হিসাবী গ্রোথ পার্টনার → `/app/affiliate` (new, see Part 2)
  - ফেসবুক কমিউনিটি → external
  - হেল্প ও সাপোর্ট সেন্টার → WhatsApp link
- **Footer:** version + OS + red "লগআউট করুন" button.

Wire the topbar button: `onClick={() => setSettingsOpen(true)}` and render `<SettingsSheet open={...} onOpenChange={...} />`.

## Part 2 — Affiliate / Growth Partner Program

Replicate the structure of `hishabee-affiliate.netlify.app` adapted for this app. Two surfaces: **public landing** + **partner dashboard**, plus **admin controls** and **referral capture in signup**.

### 2A. Database (new migration)

```sql
-- Commission tier configuration (admin-editable)
create table public.affiliate_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,             -- e.g. Bronze, Silver, Gold
  min_sales int not null default 0,
  commission_pct numeric not null,-- e.g. 15.00
  bonus_pct numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- Global affiliate settings (single row)
create table public.affiliate_settings (
  id boolean primary key default true check (id),
  default_commission_pct numeric not null default 15,
  lifetime_commission_pct numeric not null default 20,
  referee_discount_pct numeric not null default 10, -- benefit to referred customer
  is_program_active boolean not null default true,
  updated_at timestamptz default now()
);

-- An affiliate (separate from shop owner; a shop owner can also be an affiliate)
create table public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  full_name text not null,
  phone text not null,
  email text,
  referral_code text not null unique, -- short uppercase code
  current_tier_id uuid references public.affiliate_tiers(id),
  total_referrals int not null default 0,
  total_commission numeric not null default 0,
  status text not null default 'active', -- active | suspended
  created_at timestamptz default now()
);

-- Referral events (when someone signs up via a code)
create table public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  referred_shop_id uuid references public.shops(id) on delete set null,
  referral_code text not null,
  status text not null default 'pending', -- pending | converted
  converted_at timestamptz,
  created_at timestamptz default now()
);

-- Commission earnings (one row per qualifying subscription purchase)
create table public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referral_id uuid references public.affiliate_referrals(id) on delete set null,
  subscription_amount numeric not null,
  commission_pct numeric not null,
  commission_amount numeric not null,
  status text not null default 'pending', -- pending | approved | paid
  paid_at timestamptz,
  created_at timestamptz default now()
);
```

RLS: affiliates see only their own rows; admins see all (using `has_role(uid,'admin')`). `affiliate_settings` & `affiliate_tiers` readable by everyone, writable by admins only.

### 2B. Public landing page — `src/routes/affiliate.tsx`

Marketing page with sections (Bengali primary, EN toggle):
1. Hero: "হিসাবী গ্রোথ পার্টনার — বিনা পুঁজিতে ইনকামের সুযোগ" + CTA "পার্টনার হয়ে যান".
2. Why join (3 cards): উচ্চ কমিশন, বিনা পুঁজি, ক্যারিয়ার গঠন.
3. How it works — 3 steps: রেজিস্ট্রেশন → প্রোমোট → আয় করুন.
4. Commission tier table (rendered from `affiliate_tiers` so admin edits reflect live).
5. FAQ accordion (4 Qs from the reference: registration cost, how to refer, how much, how to track).
6. Final CTA → `/affiliate/register`.

Per TanStack rules: own `head()` with title/og:title/og:description.

### 2C. Affiliate registration / login — `src/routes/affiliate.register.tsx`

Form (name, phone, email, password). On submit, creates an auth user, then inserts into `affiliates` with auto-generated `referral_code` (6-char uppercase). Existing shop owners visiting `/app/affiliate` get an auto-enroll flow that reuses their auth user.

### 2D. Partner dashboard — `src/routes/app.affiliate.tsx`

Sidebar entry under "অন্যান্য" (gated only by being signed in — no permission group). Tabs:
- **ড্যাশবোর্ড**: total referrals, conversions, total earned, pending payout, current tier card.
- **শেয়ার লিংক**: copyable `https://<host>/?ref=CODE`, copy buttons for WhatsApp / FB / SMS templates.
- **রেফারেল**: table from `affiliate_referrals`.
- **কমিশন**: table from `affiliate_commissions` with status badges.

### 2E. Referral capture in signup

- Add `RefCaptureProvider` at root: reads `?ref=CODE` from the URL on first visit, validates against `affiliates.referral_code`, stores in `localStorage('aff_ref')` for 30 days.
- Modify `supabase/functions/signup-with-pin/index.ts` to accept an optional `referral_code`. When present and valid, after auth user is created insert an `affiliate_referrals` row (status `pending`). When the new user later subscribes (in `/app/subscribe` purchase flow), insert an `affiliate_commissions` row using the active commission pct, mark referral `converted`, increment `affiliates.total_*`.
- The referred customer benefit: on the subscribe page, if a `ref` cookie/storage value is present and valid, apply `referee_discount_pct` to the displayed price (visual only for now; persisted in the order).

### 2F. Admin controls — `src/routes/admin.affiliates.tsx`

New admin sidebar item "Affiliate Program" with sub-sections:
- **Settings card**: edit `default_commission_pct`, `lifetime_commission_pct`, `referee_discount_pct`, program on/off.
- **Tiers**: CRUD list (name, min sales, commission %, bonus %, sort).
- **Affiliates**: list with search, status toggle (active/suspended), tier override.
- **Commissions**: list of all earnings with bulk approve/mark-paid action.

Add admin sidebar link in `src/components/admin/AdminSidebar.tsx`.

### 2G. Where to surface referral entry to customers

When a client opens any product page on a shop's online storefront (`/f/$slug` in `f.$slug.tsx`), add a small "রেফারেল কোড আছে?" link near the price/cart that reveals an input. Submitting it stores the code in `localStorage` and shows the discounted price preview. (Pure UI hook + same capture mechanism as 2E.)

## Files

**Created**
- `src/components/app/SettingsSheet.tsx`
- `src/routes/affiliate.tsx` (public landing)
- `src/routes/affiliate.register.tsx`
- `src/routes/app.affiliate.tsx` (partner dashboard)
- `src/routes/admin.affiliates.tsx`
- `src/lib/referral.tsx` (capture provider + helpers)
- `supabase/migrations/<timestamp>_affiliate_program.sql`

**Edited**
- `src/components/app/AppTopbar.tsx` (wire Settings button)
- `src/components/app/AppSidebar.tsx` (Growth Partner link)
- `src/components/admin/AdminSidebar.tsx` (Affiliate Program link)
- `src/routes/__root.tsx` (mount `RefCaptureProvider`)
- `src/routes/f.$slug.tsx` (referral code input on storefront)
- `src/routes/app.subscribe.tsx` (apply referee discount + record commission on purchase)
- `supabase/functions/signup-with-pin/index.ts` (accept `referral_code`)

## Notes / decisions

- Default commission: 15% (matches reference site copy). Admin-editable.
- Referral code: random 6-char A–Z/0–9, regenerable from dashboard.
- All affiliate copy in Bengali first with EN fallback via `useI18n`.
- No payout integration in this iteration — admins mark commissions "paid" manually.
