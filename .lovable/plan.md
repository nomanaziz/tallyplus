
## কী কী করব

### ১. QuickOrder (দ্রুত বিক্রি) থেকে গ্রিড সরানো
`src/pages/app/QuickOrder.tsx` — যে grid/list toggle, infinite scroll, `ProductGridCard`, view-mode state, `gridProducts` ইত্যাদি যোগ করা হয়েছিল সব সরিয়ে আগের list-only UI-তে ফিরিয়ে দেব। দ্রুত বিক্রির core কাজ (নাম লিখে add, কেনা/বেচা/লাভ, ফর্দ print, বিক্রিতে রূপান্তর) **অপরিবর্তিত থাকবে** — এগুলো আপনি ভালো বলেছেন।

### ২. বিক্রয় + ক্রয় (Sell/Purchase) — গ্রিড ভিউ যোগ
`src/components/app/POSPage.tsx` (এটাই `/app/sell` ও `/app/purchase` দু'টোতেই চলে)। যা যুক্ত হবে:

- **উপরে একটা view toggle** — Grid (default) ↔ List (পুরোনো)। `localStorage["pos-view"]`-এ মনে থাকবে।
- **Grid mode-এ infinite scroll** — একসাথে ৩০টা product, scroll-এ আরও load হবে। হাজার product হলেও mobile slow হবে না।
- **Compact gorgeous card** — image (lazy), নাম, দাম/একক, stock badge, floating "+" button। আগের mockup style।
- **Server-side search (debounced 250ms)** — name/SKU/barcode।
- **একই product আবার click → cart-এ qty+1** (নতুন row নয়), badge দেখাবে cart-এ কত আছে।
- **Mobile/tablet** এ পুরোনো "পণ্য | কার্ট" tab UI-ই থাকবে; desktop-এ side-by-side।

### ৩. CustomerWishlist (গ্রাহক ফর্দ) — দোকানদারের জন্য "দ্রুত ফর্দ তৈরি"
`src/pages/app/CustomerWishlist.tsx`-এ উপরে একটা নতুন button: **"নিজে ফর্দ তৈরি করুন"**। Click করলে একটা dialog খুলবে — পুরোটাই QuickOrder-এর মতো দ্রুত typing flow, কিন্তু এটা **wishlist হিসেবে save** হবে, সরাসরি বিক্রি নয়।

Dialog-এ যা থাকবে:
- গ্রাহকের নাম, ফোন, ঠিকানা (optional), নোট
- **Product input row** — নাম লিখলে দোকানের product list থেকে suggest দেবে; না মিললে টাইপ-করা নামটাই use হবে (list-এ থাকা **বাধ্যতামূলক না**)
- প্রতিটা row-এ: **নাম, পরিমাণ, একক, কেনা দাম, বেচা দাম, লাভ** — তিনটার যেকোনো দু'টো দিলে তৃতীয়টা auto (কেনা+লাভ=বেচা, বেচা−কেনা=লাভ)
- নিচে total দেখাবে
- দু'টা button:
  - **"ফর্দ হিসেবে save"** → `customer_wishlists` + `customer_wishlist_items`-এ insert হবে, list-এ চলে আসবে
  - **"ফর্দ print"** → একই print flow যেটা QuickOrder-এ আছে

এতে আপনি wishlist page থেকেই দ্রুত ফর্দ বানাতে পারবেন এবং সেটা history-তেও থাকবে।

## Database

`customer_wishlist_items`-এ ইতিমধ্যে `name, qty, unit, price` আছে — যথেষ্ট। কেনা দাম + লাভ track করার জন্য দু'টা optional column যোগ করব:
- `cost_price numeric null`
- `profit numeric null` (computed: sale − cost; null হলে hide)

Migration approval চাইব এই দু'টা column-এর জন্য (existing রেকর্ডে null থাকবে, কোনো কিছু ভাঙবে না)।

## Tech notes

- POSPage-এর product card-কে `React.memo` করব, IntersectionObserver `rootMargin: "400px"`, image `loading="lazy"` + skeleton fallback।
- Search server-side `or(name.ilike, sku.ilike, barcode.ilike)` — ১০০০+ products হলেও fast।
- Fordo dialog-এ row-add শুধু client state, save-এ এক shot insert।
- QuickOrder revert-এর সময় `localStorage["quick-order-view"]` clean করব।

Approve করলে শুরু করছি।
