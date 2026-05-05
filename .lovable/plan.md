## Goal
Add a consistent search box to every admin module page, plus light bulk actions where relevant. Currently only Users / Affiliates / PaymentAttempts / Marketplace have any search; the rest (Admin Team, Subscription Requests, Subscriptions, Plans, Transfers, Banners, Training, ShopTypes, MarketplaceCategories, Locations, PromoPopups, PaymentGateway, SmsGateways, UsageLimits, Ads, Landing, Settings list rows) have none.

## Approach
1. Create a small reusable `AdminSearchBar` component (`src/components/admin/AdminSearchBar.tsx`) — input + clear button + optional result count, matching the existing admin styling. Debounced (200ms) controlled value.
2. For each admin page below, add a top-right search input that filters the already-loaded list client-side over the listed fields. No DB schema changes needed — all these lists are small admin tables already fetched in full.

### Pages + searchable fields

| Page | Fields searched |
|---|---|
| PlatformAdmins | full_name, email |
| SubscriptionRequests | shop name, owner phone, transaction id, plan code, status |
| Subscriptions | user email/phone, plan code, status |
| Plans | code, name |
| Transfers | from/to phone, shop name, status, transaction id |
| Banners | title, link |
| Training | title, category, youtube id |
| ShopTypes | name (bn/en), slug |
| MarketplaceCategories | name, slug |
| Locations | division/district/upazila/union name |
| PromoPopups | title, audience |
| PaymentGateway | name, provider |
| SmsGateways | name, provider, sender id |
| UsageLimits | plan code, key |
| Ads | placement, label |
| Landing | section key, title |
| Users (existing) | extend to also match email + shop name |
| Affiliates (existing) | keep, normalize to new component |
| PaymentAttempts (existing) | keep, normalize to new component |
| Marketplace (existing) | keep |

### Bulk actions (only where it has clear value)
- **SubscriptionRequests**: checkbox per row + "Approve selected" / "Reject selected" buttons (loops existing single-row mutations).
- **Transfers**: checkbox per row + "Mark complete selected" using existing single-row action.
- **Banners / PromoPopups / Training**: checkbox + "Delete selected" (calls existing delete in a loop).
Other pages get search only — bulk doesn't fit (single-row config rows, plans, gateways, etc.).

## Technical notes
- Pure client-side filter via `useMemo` over the existing query data — no new Supabase queries, no migrations.
- Bulk actions reuse the existing per-row mutation functions inside a `Promise.allSettled` loop with a single toast summary ("3 succeeded, 1 failed").
- Search state is local `useState`; not persisted to URL (admin pages here don't currently use search params).
- Bilingual placeholder via existing `useI18n()` ("খুঁজুন..." / "Search...").

## Files
- New: `src/components/admin/AdminSearchBar.tsx`
- Edited: all 18 admin page files listed above (small additions: import, useState, filter useMemo, JSX search bar; bulk pages also add a checkbox column + action bar).

No DB, RLS, edge function, or routing changes.