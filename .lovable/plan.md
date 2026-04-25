## Goal
Make every tile on the **Online Shop dashboard** clickable, and complete six pages so they fully work end-to-end. Use the previously uploaded reference images (Message page with WhatsApp/Facebook tabs already attached this turn).

## Issue today
On `/app/online-shop`:
- **Message** tile → calls `comingSoon()` (does nothing)
- **Store Settings, Online Product, Order List, Themes, Customization** tiles → all use `<Link to={t.to}>` but `onClick={() => undefined}` is also wired — the link itself works, but bottom-nav routing / mobile back-bar context can swallow taps in some cases. We will simplify all tiles to plain `<Link>` and make sure the routes themselves are complete.

## Six pages to deliver

### 1) Message (NEW) — `/app/online-shop/messages`
Matches the two reference screenshots exactly.
- Tabs: **WhatsApp** | **Facebook** (pill buttons)
- WhatsApp tab:
  - Info card: "Setup WhatsApp Chat — Enter whatsapp number Like:- 01\*\*\*\*\*\*\*\*"
  - Field: WhatsApp Number with 🇧🇩 +88 prefix
  - Save → writes `shops.whatsapp_number`
- Facebook tab:
  - Info card with steps to find Page ID
  - Field: Facebook Page ID
  - Save → writes new column `shops.facebook_page_id`
- Tile in dashboard switches from `comingSoon` to `<Link to="/app/online-shop/messages">`.

**DB migration:** add `facebook_page_id text` to `shops`.

### 2) Store Settings — `/app/online-shop/settings` (already exists, polish)
- Already complete (publish toggle, logo, banner, username, social, info). Verify links work; fix any stale references. Keep sticky save button.

### 3) Online Products — `/app/online-shop/products` (already exists, polish)
- Already wired with publish/feature switches and price/stock/description. Confirm tile navigates correctly. Add empty-state CTA "Add product" linking to `/app/products`.

### 4) Order List — `/app/online-shop/orders`
- Currently shows three empty tabs only.
- Wire to real data: read from `marketplace_orders` (or `orders` table — check) filtered by `shop_id`. Group by status:
  - **On Order** = pending
  - **Ongoing** = processing/shipped
  - **Completed** = delivered
- Each row: order # · customer name/phone · total · date · status badge · "View" button → opens detail dialog with items, address, status changer.
- Status changer updates the order row.

### 5) Themes — `/app/online-shop/themes` (already exists, polish)
- Currently has placeholder Web/App theme cards with gradient previews and Apply button → writes `active_web_theme` / `active_app_theme`.
- Add 3 web themes (Classic, Modern, Elegant) and 2 app themes (Default, Blue) with proper preview thumbnails (small mocked product card layouts inside the preview frame). Apply still saves.

### 6) Customization — `/app/online-shop/customize` (already exists, polish)
- Already supports primary/secondary color, border radius, font, and Primary/Secondary card variant with live preview.
- Add a third control: **Card shape** — round / square / pill (saved into `theme_card_variant` extension or a new `theme_card_shape` text column).
- Make the live preview match the chosen card shape (e.g., round = full radius, square = 0, pill = 9999).

**DB migration:** add `theme_card_shape text default 'square'` to `shops`.

## Dashboard tile cleanup
Update `/app/online-shop` tile array:
- Message → `to: "/app/online-shop/messages"` (remove `comingSoon`)
- All other tiles already have `to`; remove the `onClick: () => undefined` noise so behavior is purely link-based.
- Tiles for Delivery / Featured / Marketing / Policy still point at routes that don't exist — keep them as `comingSoon` for now (out of scope this turn) **OR** remove them. Plan: keep them but explicitly mark `comingSoon` so taps give clear feedback.

## Mobile/app feel
All six pages already render inside `app.tsx` shell which includes `MobileBackBar` + `MobileBottomNav`. Each new/edited page uses `PageHeader` with breadcrumb so the top back arrow is consistent.

## Files to create
- `src/routes/app.online-shop.messages.tsx`
- `supabase/migrations/<ts>_online_shop_messages_card_shape.sql` — add `facebook_page_id`, `theme_card_shape` to `shops`

## Files to edit
- `src/routes/app.online-shop.tsx` — add Message route, clean tiles
- `src/routes/app.online-shop.orders.tsx` — real orders + tabs + detail dialog
- `src/routes/app.online-shop.themes.tsx` — better preview thumbnails
- `src/routes/app.online-shop.customize.tsx` — add card shape control
- `src/integrations/supabase/types.ts` — regenerate columns

## Out of scope (will mark Coming Soon)
Delivery, Featured Products, Marketing & SEO, Shop Policy, Change Username (already inside Settings), Fraud Check, Promo Code (already exists).
