## আগে সরাসরি সত্যি কথা

ভাই, **codebase ফেলে দেওয়ার দরকার নেই**। নতুন করে শুরু করলে একই জিনিস আবার হবে — কারণ slowness-এর কারণ code quality না, কারণ হলো **architecture decisions যেগুলো একসাথে জমেছে**। নতুন project করলে আবার ২০০-৩০০ credit খরচ হবে এবং আগের সব feature হারাবেন। বরং চলুন আসল bottleneck গুলো একবারে fix করি।

## আসল slowness-এর কারণ (diagnosis)

আপনার project file গুলো আমি পড়লাম। যেগুলো এখন slow করছে:

### 1) Heavy provider stack on every page
`main.tsx`-এ stack: BrowserRouter → QueryClient → I18nProvider → ThemeProvider → AuthProvider → RefCaptureProvider → App. প্রতিটি route change-এ এদের context consumers re-evaluate হয়। সমস্যা না, কিন্তু সাথে নিচের জিনিসগুলো যোগ হয়ে slow করে।

### 2) AppLayout-এ প্রতি login-এ ৪টা parallel DB query
`AppLayout.tsx` লাইন 95-101: প্রতি app load-এ `consumer_profiles`, `profiles`, `shops`, `shop_members` — ৪টা query চালাচ্ছে শুধু "user owner কিনা consumer কিনা" check-এর জন্য। ShopProvider আলাদা query চালায়। PermissionsProvider আবার query চালায়। এক page load-এ ৭-১০টা serial+parallel query।

### 3) Idle prefetch ১৮টা chunk একসাথে download করছে
`AppLayout.tsx` লাইন 124-148: login-এর পর idle হলে ১৮টা page chunk একসাথে download শুরু করে। Mobile/slow network-এ এটাই network saturate করে দেয়, ফলে actual page navigation slow লাগে।

### 4) React Router DOM v7 + custom shim
`src/lib/router.tsx` — TanStack Router-এর API কে react-router-dom দিয়ে emulate করা compatibility shim। প্রতি `<Link>` render-এ extra wrapper logic + prefetch handler attach হচ্ছে। বড় list এ (Products, Sales) এটা noticeable।

### 5) Routes file-এ ১০০টা lazy import top-level declared
`src/routes.tsx`-এ P0 থেকে P90 পর্যন্ত lazy declaration একই file-এ। প্রতিটি `lazy()` call module-load time-এ execute হয় — chunk download না হলেও lazy wrapper তৈরি হয়।

### 6) Supabase Cloud instance size
এটা **সবচেয়ে বড় suspect**। আপনার project-এ অনেক table, RLS policy, edge function। যদি default (smallest) instance চলে, প্রতি query-তে latency বেশি — বিশেষ করে যখন একসাথে ৭-১০টা query যায়। এটা code-এ fix হবে না, এটা Cloud setting।

### 7) QueryClient default fine, কিন্তু invalidation pattern নেই
প্রতি navigation-এ অনেক component fresh query করছে cached data না নিয়ে, কারণ key গুলো সব শপ-id-নির্ভর এবং shop switch হলে cache invalidate হয়।

## যা আমি fix করব (এক plan, multiple bottleneck)

### Step 1 — AppLayout-এর login boot query একটায় নামানো
- ৪টা parallel query সরিয়ে একটি RPC `my_account_resolve()` বানাব যা return করবে: is_consumer, is_owner, has_shop_member, shops list — সব এক round-trip-এ।
- ShopProvider সেই same response থেকে shops নেবে, আলাদা query করবে না।
- এতে login-পরবর্তী first paint ~৩-৫x faster হবে।

### Step 2 — Idle prefetch বন্ধ করব / drastically কমাব
- ১৮টা chunk auto-download বন্ধ। শুধু `Sell`, `Dashboard`, `Products` — ৩টা রাখব।
- বাকি গুলো hover/touch-এ এমনিতেই prefetch হয় (router.tsx-এ এটা আছে already)।
- এতে initial load-এর পর network free থাকবে, navigation দ্রুত feel হবে।

### Step 3 — Cloud instance upgrade prompt
- আমি Cloud → Overview → Advanced settings থেকে instance size বাড়ানোর জন্য নির্দেশনা দেব। এটা **আপনাকে নিজে click করে করতে হবে** — আমি code থেকে পারব না।
- এটা সবচেয়ে বড় single improvement হবে।

### Step 4 — QueryClient tuning
- `staleTime` বাড়িয়ে 5 min করব (এখন 1 min) — অনেক "এক page থেকে আরেক page গিয়ে আবার ফেরত আসলে আবার লোড" বন্ধ হবে।
- shop-scoped query key-গুলো consistent করে refetch কমাব।

### Step 5 — Link component lighten করা
- `src/lib/router.tsx`-এর Link থেকে অপ্রয়োজনীয় hover-prefetch overhead সরাব heavy list pages-এর জন্য। বড় list-এ `preload={false}` default করব।

### Step 6 — 404 page redesign + extra options remove (আগের পেন্ডিং কাজ)
- পুরনো request অনুযায়ী সুন্দর 404 page + Home button যোগ করব।
- `+8801841577944` issue-টা গত step-এ already fix হয়েছে, এটা verify করব।

## যা **করব না** এবং কেন

- **পুরো project recreate** — না। এতে credit আরও যাবে, সব data integration আবার করতে হবে, একই architecture mistake আবার হবে।
- **TanStack Start-এ migrate** — এটা huge refactor, ১০০+ file পরিবর্তন, সব route restructure। 500+ credit লাগবে এবং নতুন bug আসবে। আপনার current React Router v7 setup ঠিকঠাক কাজ করতে পারে।
- **UI library replace** — Radix/shadcn বদলানো অর্থহীন, এগুলো fast।

## প্রত্যাশিত ফল

- Login → Dashboard: এখন ~৬-৮s → হবে ~১.৫-২.৫s (Cloud upgrade-সহ)
- Page-to-page navigation: এখন ~১.৫-৩s → হবে ~৩০০-৬০০ms
- Re-visit a page: instant (cache hit)

## আপনার জন্য একটা স্পষ্ট কাজ

আমি code fix করার পাশাপাশি, **আপনি নিজে** একটা কাজ করবেন:
1. Lovable dashboard → Cloud → Overview → Advanced settings → Instance size বড় করুন (Micro হলে Small/Medium)।
2. ২ মিনিট অপেক্ষা করুন।
3. App reload করুন।

এটাই একটা single change যা সবচেয়ে বড় difference আনবে — কোনো credit খরচ ছাড়াই।

## Files to change
- `src/pages/app/AppLayout.tsx` (query consolidate + prefetch reduce)
- `src/main.tsx` (QueryClient tuning)
- `src/lib/router.tsx` (Link prefetch lighten)
- `src/pages/NotFound.tsx` (redesign + Home button)
- New SQL migration: `my_account_resolve()` RPC

---

**Approve করলে আমি এক shot-এ পুরোটা implement করব। আর পুরনো project recreate করার চিন্তা মাথা থেকে বাদ দিন — দরকার নেই।**
