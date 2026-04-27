## Goal

Monetize free users by integrating Google AdSense (and optional custom/house ads) across the app. Subscribed (paid) users should NOT see ads. Admin should be able to fully configure everything from the Admin Portal — no code edits needed.

---

## How it works (user-facing)

- **Free users** (owners without an active subscription, and consumer/গ্রাহক portal users) → see ads in pre-defined slots (top banner, sidebar, between content blocks, mobile sticky bottom, etc.).
- **Paid subscribers** → ads automatically hidden.
- **Admin** can:
  - Turn the entire ad system ON/OFF with one switch.
  - Paste their **Google AdSense Publisher ID** (e.g., `ca-pub-1234567890123456`) and individual **ad slot IDs** for each placement.
  - Or upload **custom house ads** (image + link + title) per slot — useful before AdSense approval, or to promote own offers.
  - Choose per slot: `adsense` / `custom` / `disabled`.
  - Decide which user roles see ads (free owners only, consumers only, both).

---

## Where ads will appear

| Slot key | Location | Format |
|---|---|---|
| `app_top` | Top of `/app/*` pages (under topbar) | Responsive banner |
| `app_sidebar` | Bottom of `AppSidebar` (desktop only) | 300×600 / responsive |
| `app_mobile_sticky` | Above mobile bottom nav | Sticky 320×50 |
| `app_dashboard_inline` | Between cards on `/app/dashboard` | Responsive in-feed |
| `customer_top` | Top of `/customer/*` pages | Responsive banner |
| `customer_sidebar` | Customer desktop side rail | Responsive |
| `customer_inline` | Inside `MyFordo` / `Notes` lists every N items | In-feed |
| `fordo_public` | Public `/f/:slug` fordo view (huge free-traffic page) | Responsive banner |

Subscribers and admin pages never render ads.

---

## Technical Plan

### 1. Database (new migration)

**`ad_settings`** (singleton row, admin-managed)
- `id` (fixed = 1), `enabled` bool, `adsense_publisher_id` text, `show_to_free_owners` bool, `show_to_consumers` bool, `show_to_subscribers` bool (default false), `updated_at`.

**`ad_slots`**
- `id`, `slot_key` text unique (matches list above), `label`, `mode` enum(`adsense` | `custom` | `disabled`), `adsense_slot_id` text nullable, `adsense_format` text (auto/rectangle/horizontal), `custom_image_url`, `custom_link_url`, `custom_title`, `is_active`, `sort_order`.

**RLS:**
- `select`: public (so frontend can render).
- `insert/update/delete`: admin only (uses existing `has_role(auth.uid(),'admin')`).

Seed all 8 slot rows as `disabled` by default.

### 2. AdSense script loader

`src/lib/adsense.ts` — idempotent loader that injects:
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXX" crossorigin="anonymous"></script>
```
Only loads once per session, only when `ad_settings.enabled` AND a publisher ID exists.

### 3. Reusable component

`src/components/ads/AdSlot.tsx`
- Props: `slotKey: string`, optional `className`.
- Reads cached `ad_settings` + `ad_slots` via React Query (`['ad-config']`, 5-min stale).
- Decides what to render:
  - If user is subscriber and `show_to_subscribers=false` → render `null`.
  - If slot mode = `disabled` or globally off → `null`.
  - If `adsense` → render `<ins class="adsbygoogle" ...>` and call `(adsbygoogle = window.adsbygoogle || []).push({})`.
  - If `custom` → render `<a href={custom_link_url}><img src={custom_image_url} alt={custom_title}/></a>`.
- Always wrapped in a labelled container ("বিজ্ঞাপন / Advertisement") so ads are clearly disclosed (AdSense policy).

Subscription detection: existing `useAuth().hasActiveSubscription`.

### 4. Placements (frontend wiring)

Drop `<AdSlot slotKey="..." />` into:
- `src/pages/app/AppLayout.tsx` (top + mobile sticky)
- `src/components/app/AppSidebar.tsx` (sidebar bottom)
- `src/pages/app/Dashboard.tsx` (one inline slot)
- `src/pages/customer/CustomerLayout.tsx` (top + sidebar)
- `src/pages/customer/MyFordo.tsx` and `Notes.tsx` (inline every 5 items)
- `src/pages/f/Slug.tsx` (public fordo view top)

### 5. Admin UI — new page `src/pages/admin/Ads.tsx`

Two cards:
1. **Global settings**: enable switch, publisher ID input, audience checkboxes, "Save" button.
2. **Slot manager**: table of all 8 slots. Each row → edit dialog with mode selector (adsense/custom/disabled), AdSense slot ID, format, or custom image upload (re-use existing `dashboard-banners` storage bucket pattern), link URL, title, active toggle.

Add to `AdminSidebar.tsx`: `{ to: "/admin/ads", label: "Ads / Monetization", icon: Megaphone }` and register the route.

### 6. SEO / `ads.txt`

Add a public `ads.txt` route (TanStack-style: `/api/public/ads.txt` or static file in `public/ads.txt`) that AdSense requires. It will read the publisher ID from `ad_settings` and serve:
```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

### 7. Privacy / consent (light-touch)

Add a one-line note in `SiteFooter` linking to a basic privacy section explaining AdSense uses cookies. Full GDPR consent is out of scope for v1 (Bangladesh-focused product) but we leave a TODO comment for future Funding Choices integration.

---

## What admin needs to do after deploy

1. Apply for Google AdSense at https://adsense.google.com (using their domain `tallyplus.lovable.app` or custom domain).
2. Once approved, copy the Publisher ID + create ad units in AdSense dashboard.
3. Open `/admin/ads` → toggle ON, paste Publisher ID, paste each slot ID, save.
4. (Optional) Use "custom" mode meanwhile to display house ads / promo banners.

---

## Out of scope (not in this change)

- Full GDPR/CMP consent banner (AdSense Funding Choices)
- Per-page/per-shop ad targeting
- Revenue analytics dashboard (AdSense provides its own)
- Header bidding / multiple ad networks
