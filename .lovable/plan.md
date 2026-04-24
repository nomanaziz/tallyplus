## Plan

1. Refactor the auth page so the top bar is always visible
- Reuse the existing `AppTopbar` pattern or extract a lightweight shared header for `/auth`.
- Keep the language switch and menu entry visible on the login/signup screen.
- Ensure the auth screen layout still works well on mobile and desktop.

2. Make signup/login feel fast on the frontend
- Update `src/routes/auth.tsx` so successful login/signup sets the session and navigates immediately to the app instead of waiting for `refresh()` and `refreshShops()` sequentially.
- Move profile/shop refresh into background `Promise.all(...)` work after navigation.
- Add stricter `busy` guards so repeated taps do not create duplicate requests.
- Keep the signup/login tab switching purely local and instant.

3. Reduce the biggest app-entry bottleneck after login
- Update `src/routes/app.tsx` so the app shell can render as soon as auth is known, instead of blocking the whole page on both `loading` and `shopsLoading`.
- Show `AppTopbar` immediately, then load shop-dependent content underneath.
- Keep the “create shop” fallback only when shop loading has finished and there are truly no shops.

4. Improve shop data loading behavior
- Update `src/lib/shop.tsx` so shop refresh is more resilient and less likely to hold the whole UI hostage.
- Avoid unnecessary full-screen waiting when only shop metadata is pending.
- Preserve the current selected shop without delaying first paint.

5. Make post-login routing land on the intended home screen
- Change the auth success flow to send the user directly to `/app/dashboard` so it matches the requested “home page” behavior and avoids an extra redirect hop.
- Keep the existing `/app` redirect as a fallback, but stop relying on it as the primary entry path.

6. Small navigation polish for perceived speed
- Review `AppTopbar` mobile menu usage and ensure the sheet/sidebar opens quickly and closes on navigation.
- Keep the menu bar visible at the top on app pages and auth page for a more consistent feel.

## Technical details
- Main slow path today:
  1. `signup-with-pin` / `login-with-pin` completes
  2. `finishLogin()` calls `supabase.auth.setSession(...)`
  3. waits for `refresh()`
  4. waits for `refreshShops()`
  5. only then navigates
- This creates avoidable delay before the user sees the app.
- A second delay happens because `src/routes/app.tsx` currently blocks the whole screen on `loading || shopsLoading`.
- The auth page currently uses its own simple header, so the app top bar/menu is missing there.

## Files to update
- `src/routes/auth.tsx`
- `src/routes/app.tsx`
- `src/lib/shop.tsx`
- `src/components/app/AppTopbar.tsx`
- Possibly a new shared header component if reusing `AppTopbar` directly is too tightly coupled to authenticated data.

## Expected result
- Login/signup buttons respond faster.
- Switching between “নতুন একাউন্ট” and “লগইন” feels immediate.
- Top bar/menu is visible on the auth screen.
- After login, the user reaches the dashboard/home screen much faster.
- The app feels less stuck while shop data is loading.