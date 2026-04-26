## Plan: Marketplace Vendor View + "Stock Maintain করবেন না" toggle

দুটো জিনিস একসাথে করব —
1. **Marketplace-এ Vendor View tab** যোগ করা (Product View / Vendor View)
2. **Stock maintain না করার option** (toggle) — যেসব দোকানদার stock track করতে চায় না, তাদের পণ্য সবসময় order/list-এ যোগ করা যাবে

---

### ১. Marketplace: Product View + Vendor View

`/shop` (`src/routes/shop.index.tsx`) পেজে উপরে দুইটা tab বসাব:

- **পণ্য (Product View)** — এখন যা আছে: সব দোকানের সব listing grid-এ দেখায়
- **দোকান (Vendor View)** — শুধু দোকানের কার্ড: logo, নাম, tagline, ঠিকানা, কতটি পণ্য আছে। কার্ডে click করলে vendor home page (`/vendor/$username` বা `/shop/s/$slug`) এ যাবে — যেখানে ওই দোকানের সব পণ্য আগেই দেখা যায়

Search box দুইটা tab-এই কাজ করবে (পণ্য নাম / দোকান নাম)।

**Backend**: `marketplace-public` edge function-এ নতুন action `list-shops` যোগ করব — যেসব shop অন্তত একটা published listing রাখে, সেগুলোর তালিকা + প্রতিটির listing count return করবে। q filter, shop_type filter, pagination support করবে।

---

### ২. "Stock maintain করবেন না" toggle (পণ্য add/edit form-এ)

**Convention**: `products.stock = -1` মানে stock maintain করা হচ্ছে না (unlimited)। DB schema-তে কোনো column add লাগবে না — শুধু value `-1` ব্যবহার করব। Migration ছাড়াই কাজ হবে।

**`src/routes/app.products.tsx` (Add/Edit Product form)**:

বর্তমান "বর্তমান মজুদ" field-এর উপরে নতুন toggle:

> **"স্টক হিসাব রাখতে চান?"** (default: ON / yes)
>
> - ON হলে: এখনকার মতই "বর্তমান মজুদ" + "লো-স্টক অ্যালার্ট" fields দেখাবে
> - OFF হলে: ওই দুইটা field hide হয়ে যাবে; নিচে ছোট হিন্ট — *"স্টক unlimited হিসেবে গণ্য হবে। কেউ অর্ডার করলে stock কমবে না, low stock alert আসবে না।"*
> - Save করার সময় OFF হলে `stock = -1`, `low_stock_alert = 0` সেভ হবে

Editing-এ form খোলার সময় `stock < 0` হলে toggle OFF হিসেবে initialize হবে।

**`src/routes/app.products.tsx` list table**:
- `stock < 0` দেখালে "—" বা "অসীম" badge দেখাব, সংখ্যা না

**`src/routes/app.online-shop.products.tsx`**:
- একই রকম "অসীম" দেখাব stock কলামে যখন `stock < 0`
- Listing form-এ যদি stock field থাকে, একই toggle pattern apply করব

---

### ৩. "Stock নেই" শর্ত সর্বত্র shift করা

এখন কোডে অনেক জায়গায় `stock <= 0` মানে "out of stock"। নতুন rule:

> **out of stock = `stock === 0`** (ঠিক zero)
> **unlimited / always orderable = `stock < 0`**

নিচের জায়গাগুলোতে আপডেট করব:

- `src/components/marketplace/MarketplaceProductCard.tsx` — `listing.stock <= 0` → `listing.stock === 0`; "স্টক নেই" badge শুধু zero-তে দেখাবে
- `src/components/marketplace/AddToListButton.tsx` — `maxStock` prop optional ছিল, কিন্তু card থেকে `listing.stock` সবসময় পাঠাচ্ছে। Card-এ change করব: `maxStock={listing.stock < 0 ? undefined : listing.stock}` → unlimited হলে stepper-এ + button disable হবে না
- `src/components/marketplace/QuickViewDialog.tsx` — একই treatment; "স্টক নেই" শুধু zero-তে
- `src/routes/shop.p.$id.tsx` — Add to cart button: `disabled={listing.stock === 0}`; "স্টক আছে" line: `stock < 0` হলে দেখাব *"সবসময় অর্ডারযোগ্য"*

**Edge function `marketplace-public`**: `in_stock` filter — এখন `stock > 0` চেক করে। নতুন: `stock !== 0` (অর্থাৎ unlimited বা positive — দুটোই in-stock ধরা হবে)। যেন stock-maintain-না-করা পণ্যগুলো "in stock only" filter-এও আসে।

**Marketplace listing publish**: শুধু stock 0 হলেও যদি product `is_marketplace_published = true` হয়, listing থাকবে — শুধু "Add to cart" disable। Unlimited হলে কখনোই disable হবে না।

---

### ৪. Vendor View card design (concise)

```text
┌─────────────────────────┐
│  [logo]  দোকানের নাম      │
│          tagline         │
│  📍 ঠিকানা                │
│  🛒 ১২ টি পণ্য            │
└─────────────────────────┘
```

Mobile: 2 column, desktop: 3-4 column grid।

---

### Files to change

**Modify:**
- `src/routes/shop.index.tsx` — Tabs (Product / Vendor), Vendor grid
- `src/routes/app.products.tsx` — "স্টক হিসাব রাখতে চান?" toggle, list table "অসীম" rendering
- `src/routes/app.online-shop.products.tsx` — same handling for stock display
- `src/routes/shop.p.$id.tsx` — stock < 0 logic
- `src/components/marketplace/MarketplaceProductCard.tsx` — stock===0 badge, maxStock undefined for unlimited
- `src/components/marketplace/AddToListButton.tsx` — undefined maxStock = no upper limit
- `src/components/marketplace/QuickViewDialog.tsx` — same display logic
- `supabase/functions/marketplace-public/index.ts` — `list-shops` action, `in_stock` filter update

**Create:**
- `src/components/marketplace/VendorCard.tsx` — vendor card with logo/name/count

কোনো DB migration লাগছে না।
