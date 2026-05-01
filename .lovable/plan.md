## Goal

Improve Admin Portal: shrink the Overview page into a tight summary, make the whole admin UI mobile-friendly, add a "Platform Admins" management section (create platform admin team users with role-based permissions), and add file-upload for marketplace product images.

## 1. Overview — compact, denser, mobile-friendly

Rewrite `src/pages/admin/Index.tsx` so the dashboard fits on a phone without scrolling forever, and shows the operational numbers an admin actually checks:

**Top stat strip (2 cols mobile / 4 cols desktop, small tiles):**
- Total Users (`profiles` count)
- Active Shops
- Active Subscriptions (`status='active' AND expires_at > now()`)
- Pending Subscription Requests

**Subscription summary block** (the "subscription active user" breakdown the user asked for):
- Active subscribers grouped by plan: name, count, MRR-style monthly revenue
  - Query: `subscriptions` joined to `subscription_plans`, group by plan name, count and sum `price_bdt`
- Expiring in 7 days count
- Total revenue (sum of `price_bdt` for all active subs)
- This-month new subscriptions count

**Marketplace mini-strip:**
- Marketplace Products total + Active count
- Listings total

**Layout:** condensed cards with `text-xl` numbers (not `text-3xl`), `p-3` padding, `gap-2`, no big paragraphs. Single `max-w-6xl mx-auto p-3 sm:p-6 space-y-4` container. Each block is a `<Card>` with a tight header and a small grid inside.

## 2. Admin chrome — mobile friendly polish

In `src/pages/admin/Marketplace.tsx`, `Users.tsx`, `Subscriptions.tsx`, `SubscriptionRequests.tsx`, `Plans.tsx`:
- Replace fixed `p-6` outer wrapper with `p-3 sm:p-6`.
- Wrap wide tables in `overflow-x-auto`.
- Stack toolbar filters: `flex flex-wrap gap-2` (already partly done) and let inputs become full-width on mobile (`w-full sm:w-44`).
- Reduce header text sizes: `text-xl sm:text-2xl`.

(Light, surgical tweaks — not full rewrites.)

## 3. Platform Admin team — admin can add other admins

New page `src/pages/admin/PlatformAdmins.tsx` and sidebar entry `Admin Team` (icon: `ShieldCheck`).

**Functionality:**
- Lists every user in `profiles` who has `user_roles.role = 'admin'` (full name, phone, joined date, action: Revoke).
- "Add admin team member" button opens a dialog to create a new admin: phone + full name + 4-digit PIN.
  - Reuses the existing `create-employee-user` edge function (already creates user + sets PIN).
  - After it returns `user_id`, insert into `user_roles` `{ user_id, role: 'admin' }`.
- "Revoke" deletes the `admin` row from `user_roles`.
- Reuse existing UI primitives (Card, Table, Dialog, Input, Button, toast).

**Note on permissions:** the `app_role` enum currently has `admin`, `owner`, `consumer`, plus shop-member roles. The simplest, safest scope per request is "all admin team members get full admin access". The existing `is_admin()` SECURITY DEFINER function and RLS policies already gate everything by this role, so no DB changes are required for v1. Granular sub-admin permissions can be a future iteration.

Add a small "Admins" stat card to the Overview block (count of users with `role='admin'`).

## 4. Marketplace product image upload

In `src/pages/admin/Marketplace.tsx` Edit/New product dialog (around line 479), replace the plain "Image URL" input with an upload-or-URL combo:

- File input → upload to existing public bucket `product-images`:
  ```ts
  const path = `marketplace/${crypto.randomUUID()}.${ext}`;
  await supabase.storage.from("product-images").upload(path, file, { upsert: false });
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  setEditing({ ...editing, image_url: data.publicUrl });
  ```
- Show preview thumbnail of the current `image_url`.
- Keep the URL field as a fallback so an external URL still works.
- Add an "Upload" button next to it, with a `Loader2` while uploading (mirror the pattern in `src/pages/admin/Banners.tsx` line 44–57).

Storage bucket `product-images` is already public — no migration needed. Drivers/sellers reading `marketplace_products.image_url` will automatically see the new uploaded images.

## 5. Files to change / create

- `src/pages/admin/Index.tsx` — rewrite to compact dashboard with subscription-by-plan summary.
- `src/pages/admin/PlatformAdmins.tsx` — new page.
- `src/components/admin/AdminSidebar.tsx` — add "Admin Team" entry.
- `src/lib/app-routes.tsx` (or wherever admin routes live) — register `/admin/admins` route.
- `src/pages/admin/Marketplace.tsx` — add upload widget in product dialog; add `p-3 sm:p-6` wrapper.
- Light `p-3 sm:p-6` / `overflow-x-auto` tweaks in `Users.tsx`, `Subscriptions.tsx`, `SubscriptionRequests.tsx`, `Plans.tsx`.

No DB migrations and no new edge functions required (re-uses `create-employee-user`).
