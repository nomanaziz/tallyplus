## Goal
Make login feel immediate and predictable. The current delay is likely not because you use an iPhone alone; the bigger issue is that the app is doing too much sequential work after login and keeps the user on the login screen while that work finishes.

## What appears to be happening
- `/auth` calls the `login-with-pin` edge function.
- After success, `finishLogin()` does `setSession()`, then waits for both `refresh()` and `refreshShops()` before navigating.
- `refresh()` loads profile, roles, and subscription.
- `refreshShops()` loads shops.
- Then `/app` loads, calls `ensureProfile()` again if needed, and waits on shop data before showing content.
- The dashboard then starts its own summary RPC.

This creates a stacked wait that can feel like a freeze on mobile.

## Plan
1. **Make post-login navigation immediate**
   - Update `src/routes/auth.tsx` so a successful `setSession()` navigates right away instead of waiting for extra data fetches.
   - Move profile/shop refresh to background loading instead of blocking the route change.

2. **Remove duplicate startup fetches**
   - Stop calling shop/profile refresh in multiple places during the same login.
   - Deduplicate `ensureProfile()` / shop loading so the same request is not triggered twice during first entry.

3. **Add a clear transitional loading state**
   - Show a full-screen “লগইন হচ্ছে / প্রস্তুত হচ্ছে” state after submit succeeds.
   - Keep the entered phone/PIN stable until navigation completes so the form does not feel broken.
   - Replace the current “looks frozen” behavior with a visible progress state.

4. **Make `/app` auth loading deterministic**
   - Tighten `src/routes/app.tsx` so it does not bounce or stall while auth/shop state is still resolving.
   - Render the app shell quickly, then fill data sections as queries complete.

5. **Reduce first dashboard cost**
   - Keep the dashboard visible with skeletons/placeholders while `dashboard_summary` loads.
   - Avoid blocking the whole app layout on dashboard data.

6. **Instrument the slow path**
   - Add lightweight timing logs around login steps:
     - edge function response time
     - `setSession()` completion
     - profile load
     - shop load
     - first dashboard summary load
   - This will confirm whether the main delay is network, Supabase auth, RLS queries, or UI waiting.

## Files likely involved
- `src/routes/auth.tsx`
- `src/lib/auth.tsx`
- `src/lib/shop.tsx`
- `src/routes/app.tsx`
- optionally `src/routes/app.dashboard.tsx`
- optionally `supabase/functions/login-with-pin/index.ts` for timing logs only

## Technical details
- Current blocking point: `src/routes/auth.tsx` waits on `Promise.all([refresh(), refreshShops()])` before navigating.
- `AuthProvider` already listens to `onAuthStateChange`, so profile/session hydration can happen without blocking navigation.
- `ShopProvider` also refreshes when `user?.id` changes, so manually forcing shop refresh during login likely duplicates work.
- The dashboard summary uses an RPC; even if that query is slow, it should not block the route transition or make the login page appear stuck.

## Expected result
After the fix:
- tap login -> immediate loading state
- successful auth -> fast route transition
- app shell appears quickly
- dashboard numbers can continue loading in place
- much less “freeze” feeling, especially on mobile Safari

If you approve, I’ll implement this flow and keep the login experience visibly responsive.