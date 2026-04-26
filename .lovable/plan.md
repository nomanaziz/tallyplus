## Plan

1. Stabilize the phone+PIN login flow
- Fix the login handoff so `/auth` does not bounce back or clear the phone/PIN fields while the new session is still settling.
- Make the app wait for auth restoration before redirecting from `/app` back to `/auth`.
- Keep the login button in a true pending state, block double-submit, and show a clearer full-screen/auth-card loader message while login is in progress.
- Preserve the entered phone number during a failed or interrupted login so the form does not feel like it “reset itself”.

2. Make notifications actually work for incoming ফর্দ/অর্ডার
- Build a real notification data flow for the existing bell button in the top bar.
- Add unread count + notification dropdown/panel for the logged-in shop owner.
- Create notification rows at the server-side creation point when:
  - a customer submits a new wishlist (`customer_wishlists`)
  - a new online shop order is created (`marketplace_orders`)
- Mark notifications as read when opened and keep the UI updated with polling or realtime subscription.

3. Add visible loaders so the app never feels frozen
- Add a global app-shell loading indicator for route changes and initial `/app` boot.
- Add per-page skeleton/loading states where data is currently fetched silently, starting with the slowest-feeling screens such as Due Ledger and customer/order inbox screens.
- Show progress text for long actions like login, refresh, and notification fetch.

4. Reduce first-load slowness in the app shell
- Cut unnecessary serial fetching during app boot: auth -> profile -> shops -> permissions -> page data.
- Refactor shared boot data to load once and be reused instead of re-querying the same shop/role information in multiple providers/components.
- Convert heavy manual `useEffect` fetches to cached TanStack Query usage where appropriate so revisiting pages is instant and initial loads are clearer.
- Optimize pages that currently do multiple broad reads just to build simple totals/lists, starting with `/app/due-ledger`.

5. Verify the key journeys after implementation
- Test login with correct PIN, wrong PIN, and slow network.
- Test incoming wishlist notification end-to-end.
- Test incoming marketplace order notification end-to-end.
- Test first open vs second open of main app pages to confirm the “first time very slow” issue is reduced and loaders appear immediately.

## What I found
- The notification bell in `AppTopbar` is currently only a button; it does not load notifications, show unread count, or mark anything as read.
- A `notifications` table already exists, but I could not find active code that inserts notification rows for new wishlists/orders.
- `submit-wishlist` currently creates wishlist data but does not create a shop-owner notification.
- The login flow calls `setSession()` and navigates immediately, while `/app` can still see `user = null` briefly and redirect back to `/auth`, which matches the “fields became empty again / login spinning / confusing behavior” symptom.
- App startup is doing several client-side fetches in sequence across `AuthProvider`, `ShopProvider`, `PermissionsProvider`, and route components.
- Performance snapshot shows slow first paint on first load (TTFB ~2.3s, FCP ~4.6s), so the app needs both real optimization and much better loading feedback.

## Technical details
- Files likely involved:
  - `src/lib/auth.tsx`
  - `src/routes/auth.tsx`
  - `src/routes/app.tsx`
  - `src/components/app/AppTopbar.tsx`
  - `src/routes/app.due-ledger.tsx`
  - `src/routes/app.customer-wishlist.tsx`
  - order creation path for `marketplace_orders`
  - current wishlist submit server-side handler
- Notification implementation will reuse the existing `notifications` table instead of inventing a second system.
- Performance work will prioritize low-risk fixes first: better auth/session coordination, fewer duplicate boot queries, cached query usage, and visible pending states.
- If needed, I may add one small migration only if notification metadata/unread behavior needs an extra column or index; otherwise I’ll use the existing schema.