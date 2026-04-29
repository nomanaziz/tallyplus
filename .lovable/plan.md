## Goal
Fix the real cause of the published `Not Found` error so direct links like `/admin/login` and `/pricing` open correctly on `tallyplus.lovable.app`.

## What is actually broken
The current app is still using a classic Vite SPA setup:
- `src/main.tsx` mounts `BrowserRouter`
- routes are defined in `src/routes.tsx`
- pages live under `src/pages/`
- there is no TanStack Start router bootstrap (`src/router.tsx`, `src/routes/__root.tsx`, file routes)

Because of that, the published root URL works, but direct subpaths like `/admin/login` and `/pricing` return the platform-level `Not Found` page before React can load.

The `_redirects` and `vercel.json` fallback files are not the right fix for this hosting setup and should not be the long-term solution.

## Implementation plan
1. Replace the current `BrowserRouter` bootstrap with a TanStack Start router setup.
   - Create `src/router.tsx`
   - Create `src/routes/__root.tsx`
   - Update `src/main.tsx` to render the TanStack router provider instead of `BrowserRouter`

2. Convert the current central route table into file-based routes under `src/routes/`.
   - Preserve existing public URLs exactly:
     - `/`
     - `/auth`
     - `/pricing`
     - `/privacy`
     - `/terms`
     - `/admin/*`
     - `/app/*`
     - `/customer/*`
     - `/shop/*`
     - `/affiliate/*`
     - `/vendor/:username`
     - `/f/:slug/*`
   - Reuse the existing page components from `src/pages/` where possible so the visual UI does not need a full rewrite

3. Rebuild nested sections using layout routes.
   - `admin` layout route for `Admin.tsx`
   - `app` layout route for `AppLayout.tsx`
   - `customer` layout route for `CustomerLayout.tsx`
   - `shop`, `affiliate`, and other nested areas the same way
   - Ensure every layout route renders an `Outlet` so child pages display correctly

4. Keep the current admin auth behavior, but bind it to the new route system.
   - `/admin/login` must remain public
   - `/admin` and child admin pages must still check Supabase auth + `user_roles`
   - Confirm redirect behavior still sends non-admin users back to `/admin/login`

5. Add proper global not-found and error handling in the router.
   - Root `notFoundComponent` for unknown URLs
   - Router-level default error UI
   - This prevents broken generic failures after migration and makes route issues easier to diagnose

6. Remove routing workarounds that do not belong in this stack.
   - Remove `public/_redirects`
   - Remove `vercel.json` rewrite workaround if it is no longer needed
   - Remove any remaining app code that assumes `react-router-dom` is the runtime router

7. Verify the critical published paths after the migration.
   - `/admin/login`
   - `/pricing`
   - `/auth`
   - `/app/due-ledger`
   - one nested dynamic route such as `/vendor/:username` or `/shop/p/:id`
   - Then republish so the frontend changes go live

## Technical details
- Current evidence confirms the problem is architectural, not just a bad deploy:
  - `https://tallyplus.lovable.app/` loads
  - `https://tallyplus.lovable.app/admin/login` returns plain `Not Found`
  - `https://tallyplus.lovable.app/pricing` also returns plain `Not Found`
- This means the published host is not resolving those URLs through the app’s current SPA router.
- The fix is to move to Lovable’s supported routing model, not add more rewrite files.

## Expected result
After this migration:
- direct links to `/admin/login` will open correctly
- refresh on nested pages will work
- existing URLs stay unchanged
- admin login can be used from the published domain instead of only from in-app navigation