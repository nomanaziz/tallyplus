## Quick Sell — Grid View (default) যোগ করব

ফাইল: `src/pages/app/QuickOrder.tsx` (একমাত্র পরিবর্তন, কোনো DB migration নেই)।

### 1. View toggle (header এ)
- দুটি icon button: **Grid | List** (rounded pill toggle)।
- Default: **grid**।
- User-এর choice `localStorage["quick-order-view"]` এ save।

### 2. Grid view — paginated + infinite scroll
- Search bar এর নিচে product grid render হবে (existing search dropdown grid mode-এ off)।
- প্রথম load: শুধু **30টি** product (`range(0, 29)`, `order: name asc`)।
- নিচে invisible sentinel `<div>` — `IntersectionObserver` দিয়ে viewport-এ এলে পরের 30টি fetch।
- Search query থাকলে list reset হয়ে filtered query চলবে (debounced 250ms, server-side `or(name.ilike,sku.ilike,barcode.ilike)`)।
- হাজার product হলেও কখনো একসাথে সব load হবে না।

### 3. Card design (uploaded reference + polish)
- Responsive: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7`
- Card: aspect-square image area (muted bg, `loading="lazy"`, `decoding="async"`, fallback `ImageOff` icon যদি `image_url` null হয়)
- নিচে: bold price (৳), product name (line-clamp-2), unit + stock muted text
- নিচ-ডানে floating round **primary "+"** button (gradient, hover scale-105) — click করলে cart এ add
- Already-in-cart card-এ subtle primary ring + corner badge `×N` (qty দেখাবে)

### 4. Smart cart behavior
- একই product বার বার click করলে **নতুন row হবে না** — existing row এর qty++ হবে।
- External (out-of-stock) item add list view এর search box থেকে আগের মতই কাজ করবে।

### 5. Mobile-first performance
- Image lazy-load — off-screen image browser নিজে skip করে
- Card React.memo — cart update হলে পুরো grid re-render হবে না
- Sticky search header (existing) — scroll করার সময় হারাবে না
- 2-column minimum — ছোট ফোনেও fit হয়
- "+" button minimum 36×36 px touch target

### 6. List view অপরিবর্তিত
- বর্তমান search → typing → enter flow পুরোপুরি একই রকম থাকবে
- শুধু toggle করে user যেকোনো সময় switch করতে পারবে

### Technical notes
- নতুন state: `viewMode`, `gridProducts`, `gridPage`, `gridLoading`, `gridDone`, `sentinelRef`
- নতুন memoized: `cartQtyMap` (productId → cart qty)
- `addStoreProduct` modify — duplicate detect করে qty bump
- DB-তে `products.image_url` already আছে — schema change লাগবে না