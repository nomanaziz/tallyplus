# Marketplace UX উন্নয়ন

আপনার দেওয়া Chaldal-এর sample অনুসরণ করে marketplace-এ ৩টি প্রধান উন্নয়ন আনব।

## ১. প্রতিটি product card-এ "List-এ যোগ করুন" button

বর্তমানে marketplace grid-এ প্রতিটি card শুধু product detail page-এ নিয়ে যায়। Chaldal-এর মতো এক click-এ list-এ add করার ব্যবস্থা যোগ করব।

- প্রতিটি card-এর image-এর উপর right-bottom corner-এ একটি বৃত্তাকার `+` button (primary color, sample-এর মতো)
- Click করলে: `tp_consumer_cart` localStorage-এ এই listing add হবে (`min_order` quantity দিয়ে; ইতিমধ্যে থাকলে qty +1)
- Card click করলে আগের মতোই detail page-এ যাবে (button-এ `e.stopPropagation()` + `e.preventDefault()`)
- Button click হলে `+` icon পরিবর্তে quantity number দেখাবে (sample-এর ২য় image-এর মতো)
- Toast দেখাবে: "List-এ যোগ করা হয়েছে"
- Stock 0 হলে button disabled

একই pattern apply হবে:
- `src/routes/shop.index.tsx` (marketplace grid)
- `src/routes/shop.s.$slug.tsx` (legacy slug shop page)
- `src/routes/vendor.$username.tsx` (public vendor page)

Detail page-এর "ফর্দে যোগ করুন" button-এর label "List-এ যোগ করুন"-এ পরিবর্তন করব consistency-র জন্য।

## ২. দোকানে click করলে দোকানের home page যাবে

বর্তমান সমস্যা: marketplace card-এ shop name দেখায় কিন্তু সেটা clickable না — পুরো card detail page-এ নিয়ে যায়। আপনার অভিযোগ অনুযায়ী "দোকানের নাম click করলে দোকানের home page আসা উচিত"।

সমাধান:
- প্রতিটি product card-এর নিচে shop name/logo এখন আলাদা mini-link হবে যা `/{username}` (vendor page) বা fallback হিসেবে `/shop/s/{slug}` খুলবে
- Card-এর main click → product detail; shop chip-এ click → shop home page (event propagation থামাব)
- Vendor page (`vendor.$username.tsx`)-এ ইতিমধ্যে দোকানের নাম, address, phone, cover, logo, policies সব দেখায় — সেটাই "দোকানের home"

## ৩. Quick View button (modal-এ product preview)

ভিতরে গিয়ে ঢোকা সময়সাপেক্ষ — তাই card-এর উপর hover/tap-এ একটি "Quick View" (চোখের icon) button থাকবে যা একটা dialog-এ product image, name, price, stock, unit, "List-এ যোগ করুন", এবং "বিস্তারিত দেখুন" link দেখাবে।

- নতুন component: `src/components/marketplace/QuickViewDialog.tsx`
- Card-এর image-এর উপর top-right-এ ছোট eye icon button
- Mobile-এ button সবসময় visible (small), desktop-এ hover-এ visible
- Dialog-এ same `addToCart` logic ব্যবহার হবে

## ৪. Card design — sample অনুযায়ী compact

Sample-এর মতো ছোট, dense card:
- Image aspect square রাখা
- Price prominent (red/primary), strike-through original price (যদি future-এ থাকে)
- Unit label (যেমন "500 gm") image-এর নিচে compact font-এ
- "+" button image-এর নিচে-ডানে floating
- Mobile-এ 2 columns, sm 3, md 4, lg 5 (এখন lg 3, xl 4 আছে — denser করব)

## Technical Section

**নতুন/পরিবর্তিত files:**
- `src/components/marketplace/AddToListButton.tsx` — reusable circular `+` button with qty state, reads/writes `tp_consumer_cart`
- `src/components/marketplace/QuickViewDialog.tsx` — Dialog wrapper with product preview + AddToListButton
- `src/components/marketplace/MarketplaceProductCard.tsx` — shared compact card used by all 3 routes (DRY)
- `src/routes/shop.index.tsx` — replace inline card JSX with `MarketplaceProductCard`; tighten grid breakpoints
- `src/routes/shop.s.$slug.tsx` — replace inline card with `MarketplaceProductCard`
- `src/routes/vendor.$username.tsx` — replace inline card with `MarketplaceProductCard`
- `src/routes/shop.p.$id.tsx` — rename button label to "List-এ যোগ করুন"

**Cart logic (extract to `src/lib/consumer-cart.ts`):**
```ts
export function addListingToCart(item: CartItem) { /* read, upsert, write */ }
export function getCartQty(listingId: string): number
export function useCartQty(listingId: string): number  // subscribes to storage event
```

**Shop link priority:**
- যদি `shops[shop_id].username` থাকে → `/{username}` (need to add `username` to `marketplace-public` `list` action's shop select)
- নাহলে fallback → `/shop/s/{slug}`
- দুটোই না থাকলে link disabled

**Edge function update (`supabase/functions/marketplace-public/index.ts`):**
- `attachShopsAndProducts` এর `select` query-তে `username` field add
- `ShopRow` type-এ `username` যোগ

**Database migration:** প্রয়োজন নেই — `username` column ইতিমধ্যে `shops` table-এ আছে (vendor page থেকে confirmed)।

## Out of scope

- Slide-out cart drawer (sample-এর right side panel) — পরবর্তী step-এ করা যাবে; এখন শুধু toast feedback
- Coupon/discount price strike-through UI — ডেটা মডেলে original_price নেই, পরে যোগ হবে
- "Flash sale", "Categories sidebar" — পরবর্তী iteration
