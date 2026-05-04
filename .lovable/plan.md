## Goals

1. Fix "row-level security policy" error when admin uploads product images (Marketplace product images).
2. Move admin login URL from `/admin/login` to `/xbd-login` (hide the obvious admin path).
3. Add a small captcha (math-based) to the new admin login page.

---

## 1. Fix product-images RLS for admins

**Root cause:** The `product-images` bucket only has an INSERT policy that requires the first folder of the path to equal `auth.uid()`. Admin uploads use path `marketplace/<uuid>.ext`, so the policy rejects them.

Existing policies on `storage.objects` for `product-images`:
- INSERT: `auth.uid()::text = (storage.foldername(name))[1]` — admin path fails
- SELECT: owner OR `is_admin(auth.uid())` — fine
- UPDATE: owner only — admin fails

**Migration (requires approval):**
```sql
create policy "admin insert product-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

create policy "admin update product-images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()));

create policy "admin delete product-images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()));
```

This lets admins upload/update/delete any path inside `product-images` while keeping shop owners' folder-scoped access intact.

---

## 2. Move admin login to `/xbd-login`

**Routing (`src/lib/app-routes.tsx`):**
- Add a top-level route `{ path: "xbd-login", element: <Suspense><L8/></Suspense> }`.
- Keep `/admin/login` removed (delete the existing `path: "login"` child) so the old URL 404s.
- `/admin` (parent layout) still requires admin auth and now redirects unauthenticated users to `/xbd-login` instead of `/admin/login`.

**Files to update:**
- `src/lib/app-routes.tsx` — add `xbd-login`, remove `admin/login` child.
- `src/pages/Admin.tsx` — change `nav({ to: "/admin/login" })` redirects to `/xbd-login`.
- `src/pages/admin/Login.tsx` — change post-success nav (already goes to `/admin`, fine); update the "already logged in" redirect target if needed; update the bottom link.
- `src/components/site/LoginCard.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/lib/home-redirect.ts`, `src/pages/admin/MyCredentials.tsx` — replace any references to `/admin/login` with `/xbd-login`.

---

## 3. Add small captcha to `/xbd-login`

Use a lightweight client-side math captcha (no third-party dependency, no extra secrets). Pattern:
- On mount and after each failed attempt, generate `a + b` (1–9 each) and store the expected sum.
- Add an input "Solve: 3 + 7 =" — login button is disabled until input matches.
- On submit, double-check the answer; reset captcha on failure.

This is added directly in `src/pages/admin/Login.tsx`. It blocks naive bot login attempts and pairs with the obscured URL.

---

## Notes

- No edge function or new package required.
- Existing admins keep working; only the URL changes.
- The published site's old `/admin/login` will stop working — communicate to existing admins to use `/xbd-login`.
