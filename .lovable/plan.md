## POS-এ stock-out products লুকানো

### সমস্যা
সব product POS list-এ আসছে, এমনকি stock = 0 হলেও। যেসব product-এর stock track করা হচ্ছে, সেগুলো stock-out হলে POS-এ আসা উচিত না। যেসব product-এর stock track নাই (সেবা/অসীম), সেগুলো সবসময় দেখাবে।

### সমাধান

**১) DB migration — `products.track_stock` column**
- নতুন column: `track_stock boolean not null default true`
- বিদ্যমান সব row default `true` পাবে (backward-safe — এখন যেমন আচরণ সেটাই)।

**২) POS query filter (`src/lib/queries.ts` – `productsLiteQuery`)**
- `.select(...)` এ `track_stock` যোগ করব।
- Server-side filter:
  ```
  .or("track_stock.eq.false,stock.gt.0")
  ```
  অর্থাৎ — track বন্ধ থাকলে সবসময় দেখাও; track on থাকলে শুধু stock > 0 হলে দেখাও।

**৩) Products list page (`src/pages/app/Products.tsx`)**
- Product create/edit form-এ একটা switch/checkbox যোগ করব: "স্টক হিসাব রাখব" (default on)।
- Save করার সময় `track_stock` field insert/update হবে।
- Stock input field-টা `track_stock=false` হলে disabled/hidden হবে।

**৪) POS UI (`src/components/app/POSPage.tsx`)**
- Already stock badge দেখায় — `track_stock=false` হলে badge না দেখাব (optional polish)।
- Cart-এ add করার সময় stock check বর্তমানে আছে কিনা দেখব — থাকলে `track_stock=false` skip করব।

### যা পরিবর্তন হবে না
- Sale flow, stock_movement triggers, reports, marketplace।

### Files
- নতুন migration: `track_stock` column add।
- `src/lib/queries.ts` — productsLiteQuery filter।
- `src/pages/app/Products.tsx` — form toggle।
- `src/components/app/POSPage.tsx` — minor stock-check bypass for untracked।
