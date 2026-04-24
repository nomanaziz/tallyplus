# Plan — Contacts, Stock Edit & Access Management Overhaul

## 1) যোগাযোগ (Contacts) — `/app/contacts`

### A. Tabs: 3-tab structure
- কাস্টমার (Customers) | সাপ্লায়ার (Suppliers) | **কর্মচারী (Employees)** — নতুন tab
- প্রতিটি tab-এ count badge: `কাস্টমার (১)` মত
- Employees tab data source: `shop_members` + `profiles` (existing `shopMembersQuery` reuse)

### B. Master-detail layout (screenshot match)
- বাম পাশে: search box + contact list (avatar + নাম + phone + → arrow)
- ডান পাশে: selected contact card (avatar, নাম + Customer/Supplier/Employee badge, phone)
  - Top-right action buttons: **এডিট করুন** (pencil), **মুছে ফেলুন** (red trash), **রিফ্রেশ**
  - নিচে transaction/বাকি table: বিক্রির রিপোর্ট # | সময় | তথ্য | আইটেম | লেনদেনের ধরন | পরিমাণ
  - Empty state when no transactions

### C. Direct contact actions (per selected contact)
নিচে action row বা detail header-এ ৩টি icon button:
- **📞 Call** → `tel:+88017xxxxxxxx`
- **WhatsApp** → `https://wa.me/8801xxxx?text=<encoded বাকি reminder>`
  - Pre-filled message: "আসসালামু আলাইকুম {নাম}, আপনার বর্তমান বাকি ৳{amount}। অনুগ্রহ করে পরিশোধ করুন।"
- **Telegram** → `https://t.me/+8801xxxx?text=<encoded>` (or share fallback `https://t.me/share/url?...`)
- Phone validation + `encodeURIComponent` for text

### D. "যুক্ত করুন" button (top-right) + bottom CTA
- Tab অনুযায়ী dialog title পরিবর্তন (কাস্টমার যুক্ত করুন / সাপ্লায়ার যুক্ত করুন / কর্মচারী যুক্ত করুন)
- Employee add → opens **3-step Access flow** (section 3)

---

## 2) স্টক এডিট (Stock Edit) — `/app/stock-edit`

### Polish to match screenshot
- Header: back arrow + "স্টক এডিট" (large bold), right side ক্যানসেল (outline) + সংরক্ষণ করুন (dark)
- Toolbar row: search | barcode icon button | sort dropdown ("নতুন থেকে পুরাতন") | All (২) filter | রিফ্রেশ
- Table polish:
  - Columns: পণ্যের নাম | বর্তমান মজুদ | দর | আপডেটেড স্টক
  - Stepper: red `−` (square, rose-100) | center number input (blue underline focus) | green `+` (emerald-500)
  - Stock numbers in Bangla numerals
  - Hover row highlight, zebra stripe
- Footer: "Showing 1 to N of N Products"
- Bulk save persists changes + creates `stock_movements` (already wired) — verify diff logic & toast

---

## 3) এক্সেস ম্যানেজমেন্ট (Access) — `/app/access`

### A. Member list (left) — keep current, polish
- Show owner pinned top, others below with role pill

### B. "নতুন ইউজারকে এক্সেস দিন" → **3-step dialog** (matches screenshots 38-41)

**Step 1 — Profile (image-38)**
- Avatar uploader "ইউজার এর ছবি যুক্ত করুন" (uploads to `shop-logos` or new `user-avatars` bucket; optional)
- নাম * | ফোন নম্বর * (+88 prefix, BD flag) | ঠিকানা | ইমেইল
- "পরবর্তী ধাপ" button (full-width black)
- Validation: name required, phone 11 digits

**Step 2 — Role + permissions (image-39, 40, 41)**
- Role selector tabs: **EMPLOYEE | MANAGER | OWNER | + নতুন পদবী যোগ**
  - Each role shows preset checked permissions:
    - EMPLOYEE: কেনা (4 items) + বিক্রি (2 items)
    - MANAGER: কেনা (4) + বিক্রি (5)
    - OWNER: full set (কেনা, বিক্রি, বাকি, খরচ, যোগাযোগ, ... — all groups from current `FEATURE_GROUPS_BN`)
- Toggle individual পিল-checkboxes (green-bg when checked)
- "+ নতুন পদবী যোগ" → **Step 2b: New Role dialog (image-42)**
  - পদবীর নাম * (Role Name input)
  - Module-level toggles (Switch for each group: কেনা, বিক্রি, বাকি, খরচ, যোগাযোগ, প্রোডাক্ট লিস্ট, স্টকের হিসাব, এস এম এস, ব্যবসার রিপোর্ট, টপ আপ, অনলাইন শপ, শপ)
  - "সেভ করুন" → saves to new `custom_roles` table, appears as new tab

- "সেভ করুন" → creates `shop_members` row + permissions

### C. Selected member detail (right pane)
- Show role tabs (Employee/Manager/Owner/custom) — current role highlighted
- Permission pills (read-only by default, edit on click "এডিট")
- Edit + Delete actions for non-owner members

---

## Database changes

```sql
-- Custom roles per shop (besides owner/manager/cashier)
create table public.shop_custom_roles (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  permissions jsonb not null default '{}'::jsonb,  -- { "purchase": true, "sell": true, ... }
  created_at timestamptz default now(),
  unique (shop_id, name)
);
alter table public.shop_custom_roles enable row level security;
create policy "members read custom roles" on public.shop_custom_roles
  for select using (public.is_shop_member(auth.uid(), shop_id));
create policy "owner manages custom roles" on public.shop_custom_roles
  for all using (exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid()));

-- Per-member permission overrides + profile fields
alter table public.shop_members
  add column if not exists permissions jsonb default '{}'::jsonb,
  add column if not exists custom_role_id uuid references public.shop_custom_roles(id) on delete set null,
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists avatar_url text;
```

`permissions` JSON shape:
```json
{ "purchase": ["buy","cart_edit","discount","delivery"],
  "sell": ["sell","quick_sell"], ... }
```

---

## Files to create / modify

**Modify**
- `src/routes/app.contacts.tsx` — 3 tabs, master-detail, call/WA/Telegram buttons
- `src/routes/app.stock-edit.tsx` — header/toolbar/table polish
- `src/routes/app.access.tsx` — wire 3-step dialog + custom-roles tab
- `src/lib/queries.ts` — add `customRolesQuery`, extend `shopMembersQuery` with permissions
- `src/integrations/supabase/types.ts` — regenerated by migration

**Create**
- `src/components/app/NewUserAccessDialog.tsx` — 3-step wizard (Step1 Profile → Step2 Role/Permissions)
- `src/components/app/NewRoleDialog.tsx` — custom role creator (image-42)
- `src/components/app/ContactActionsBar.tsx` — Call / WhatsApp / Telegram icon buttons
- `src/lib/permissions.ts` — preset role → permissions map (EMPLOYEE/MANAGER/OWNER) + helper `hasPerm()`
- Migration file with SQL above

---

## Technical notes
- WhatsApp/Telegram links use `encodeURIComponent` on the message; phone normalized to `8801XXXXXXXXX` (no `+`, no spaces).
- Permissions enforced UI-side via `hasPerm(member, 'sell.discount')`; server-side RLS unchanged (still owner/manager/cashier role-based) — granular perms are app-level for now.
- Avatar upload optional; if skipped, fallback to initials.
- Custom roles render as additional tabs alongside EMPLOYEE/MANAGER/OWNER inside the Step 2 selector.
- Bangla numerals via existing `bnNum()` helper everywhere.

After approval I'll implement migration + all files in one pass.
