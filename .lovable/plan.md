## Goal
"গ্রাহক ফর্দ" — shop owner shares a unique link; customer opens it on phone, fills name + mobile + (optional address) and adds a list of items they want to buy; owner sees all incoming wishlists in a new menu inside the app.

Inspired by the Fordo app screenshots — minimal, mobile-first, color-coded list cards, simple checkbox items.

## User flow

**Owner side (inside app):**
1. New sidebar menu item: "গ্রাহক ফর্দ" (Customer Wishlist).
2. Page shows:
   - A copyable share link (auto-generated per shop, e.g. `/f/<slug>`) with WhatsApp / SMS / Copy buttons.
   - A list of incoming wishlists — each card shows customer name, phone, time, item count, address (if given), and a status pill (নতুন / দেখা হয়েছে / সম্পন্ন).
   - Tap a card → detail view with the full item list, mark items as bought (checkbox), call/WhatsApp the customer, mark wishlist as complete or delete.

**Customer side (public, no login):**
1. Customer opens shared link → public page branded with the shop name & logo.
2. Form: নাম, মোবাইল নাম্বার, ঠিকানা (optional).
3. Add items to a list (Fordo-style): each row = product name + quantity + unit; checkbox + remove + reorder.
4. Optional color picker for the card (matches Fordo aesthetic).
5. Submit → "ধন্যবাদ! দোকানদার শীঘ্রই যোগাযোগ করবেন।" thank-you screen with option to start a new list.

## Database (new tables)

```sql
-- Public unique slug per shop for sharing
alter table public.shops add column wishlist_slug text unique;
-- (auto-fill on first owner visit if null)

create table public.customer_wishlists (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_address text,
  note text,
  color text default 'default',           -- card color
  status text not null default 'new',     -- new | seen | done
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.customer_wishlists(id) on delete cascade,
  name text not null,
  qty numeric,
  unit text,
  position int not null default 0,
  done boolean not null default false
);

create index on public.customer_wishlists(shop_id, created_at desc);
create index on public.customer_wishlist_items(wishlist_id, position);
```

**RLS**
- `customer_wishlists` and `customer_wishlist_items`: only shop members can SELECT / UPDATE / DELETE.
- INSERT into both tables happens via a public edge function using the service role — RLS stays closed for inserts from the browser.

## Public submission (no login)

A small Supabase edge function `submit-wishlist`:
- Input: `{ slug, customer_name, customer_phone, customer_address?, note?, color?, items: [{name, qty?, unit?}] }`
- Looks up `shop_id` from `shops.wishlist_slug`.
- Validates phone format and item count (1–100).
- Inserts wishlist + items with service role.
- Returns `{ ok: true }`.

A second public lightweight edge function `wishlist-shop-info`:
- Input: `{ slug }` → returns `{ shop_name, shop_logo_url }` for the public page header.

This keeps writes safe (no public anon write to the database) and keeps the table closed under RLS.

## Routes

- `src/routes/app.customer-wishlist.tsx` — owner list view with share link + cards.
- Customer detail can be a dialog inside the same page (like other ledgers) or `app.customer-wishlist.$id.tsx`. Plan: dialog for simplicity.
- `src/routes/f.$slug.tsx` — public Fordo-style submission page (no auth, lightweight bundle).
- Sidebar entry added in `src/components/app/AppSidebar.tsx` and the dashboard tile grid in `src/routes/app.dashboard.tsx`.

## Edge functions

- `supabase/functions/submit-wishlist/index.ts`
- `supabase/functions/wishlist-shop-info/index.ts`

Both with CORS, zod-style validation, rate-friendly (no spammy loops).

## UI / Design (matching Fordo style)

- Mobile-first cards with soft pastel backgrounds (peach, mint, lavender, sky, butter) — picked from a small palette.
- Big rounded inputs, generous spacing, large touch targets.
- Bangla typography first; English fallback per existing `useI18n`.
- Use the project's existing semantic tokens — no hardcoded colors.
- Owner list = grid/stack of compact cards similar to Fordo home screen.
- Customer page = single colored card with header, inputs, item list, big floating "+" add button, sticky "পাঠান" submit button.

## Sharing

- Build the share URL on the client: `${window.location.origin}/f/${slug}`.
- WhatsApp: `https://wa.me/?text=...` with a friendly Bangla message.
- SMS: `sms:?body=...`
- "কপি করুন" button (clipboard).

## Reuse / no duplication

- Use existing Supabase client and `ShopProvider` for the current shop.
- No changes to existing tables besides the new `wishlist_slug` column.
- Use existing `Dialog`, `Input`, `Button`, `Badge` components.

## Out of scope (explicit)

- Owner reply / chat with the customer (only call & WhatsApp deep links).
- Converting wishlist directly to an invoice (could be a follow-up).
- Customer login / account (intentionally anonymous).
- Image uploads for items (text only for now).

## Files to create / change

**New**
- `supabase/migrations/<ts>_customer_wishlist.sql`
- `supabase/functions/submit-wishlist/index.ts`
- `supabase/functions/wishlist-shop-info/index.ts`
- `src/routes/app.customer-wishlist.tsx`
- `src/routes/f.$slug.tsx`

**Edit**
- `src/components/app/AppSidebar.tsx` — add menu entry.
- `src/routes/app.dashboard.tsx` — add tile in "অন্যান্য".
- `src/lib/icons.ts` (if a new icon needed) — reuse `customerWishlist` placeholder.
- `src/lib/queries.ts` — add `customerWishlistsQuery`, `customerWishlistDetailQuery`.

If approved, I’ll implement the schema, both edge functions, the owner page, and the public Fordo page in one pass.