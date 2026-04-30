## পরিস্থিতি (পরিষ্কার সত্য)

**TanStack Router এবং TanStack Start আগের turn এই ১০০% remove হয়ে গেছে।** আমি এখন verify করেছি:

- `src/routes/` folder নাই (deleted)
- `createFileRoute`, `routeTree`, `createRootRoute` — কোথাও নাই (০ matches)
- `@tanstack/react-router`, `@tanstack/react-start` — package.json এ নাই
- App এখন pure **React Router DOM v6 SPA** — `BrowserRouter` + `useRoutes` + `lazy()` code-splitting

বাকি আছে শুধু একটাই TanStack জিনিস: **`@tanstack/react-query`** (আর তার core: `@tanstack/query-core`)। কিন্তু এটা router না, framework ও না — এটা একটা data caching library যেটা ৪৫+ files এ data fetching চালায় (Dashboard, POS, Products, Orders, সব)। **এটাই app টা fast রাখে** — cache থেকে instant data দেয়, duplicate API call আটকায়। সরালে app **slower** হবে।

আপনি বলেছেন "performance ই priority"। তাই React Query রাখব এবং performance এর জন্য বাকি cleanup ও optimize করব।

## কী কী করব

### 1. Project এর নাম ঠিক করা
`package.json` এ এখনও পুরনো নাম `"tanstack_start_ts"` রয়ে গেছে — এটা confusing। নাম change করে `"tallyplus"` করব।

### 2. Vite config থেকে পুরনো reference clean করা
`vite.config.ts` এর manualChunks এ `"query"` chunk আছে (TanStack query এর) — এটা ঠিক আছে রাখব (performance এর জন্য ভালো), কিন্তু পুরো config টা একবার রিভিউ করে dead/unused কিছু থাকলে সরাব।

### 3. Performance optimizations
যেহেতু আপনার একমাত্র শর্ত হলো **fast**, এই কাজগুলো করব:

- **Route preloading**: heavy routes (Dashboard, Sell, Products) এ idle-time prefetch — click করার আগেই lazy chunk download শুরু হবে।
- **React Query tuning verify**: `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus: false` — আগেই tuned আছে, কিন্তু individual page এ অযথা refetch হচ্ছে কিনা check করব।
- **Bundle audit**: `manualChunks` এ react-vendor, supabase, query, radix, charts, icons আলাদা — এটা parallel download এর জন্য ভালো। Verify করব ঠিকঠাক split হচ্ছে।
- **Lazy heavy components**: যদি কোনো বড় component (chart, barcode scanner, PDF) eagerly load হচ্ছে দেখি, lazy করব।
- **Image lazy loading**: `<img loading="lazy">` ব্যবহার নিশ্চিত করা।

### 4. Live preview এ test করে confirm
Performance profile চালিয়ে before/after দেখাব — Web Vitals (LCP, FCP, TTI), long tasks, bundle size।

### 5. কী **করব না** (এবং কেন)
- ❌ React Query সরাব না — এটা সরালে app slow হবে, fast হবে না। এটা router না।
- ❌ আবার scratch থেকে rebuild করব না — গত turn এ migrate করা হয়েছে, এখন আবার ভাঙলে নতুন bug আসবে।

## প্রযুক্তিগত বিবরণ (technical)

```text
Stack এখন:
  React 19 + Vite 7 + React Router DOM 6 (SPA)
  ├─ Data: @tanstack/react-query (cache layer, NOT router)
  ├─ DB: Supabase
  ├─ UI: Radix + Tailwind v4 + shadcn
  └─ Local: Dexie (IndexedDB)

Bundling: lazy() + Suspense + manualChunks (react-vendor, supabase, query, radix, charts, icons)
```

আপনি Approve দিলে আমি execute mode এ গিয়ে কাজ শুরু করব।
