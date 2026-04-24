## Plan: App speed fix + Cloud/AI/API clarification

অ্যাপের slow হওয়াটা আমি গুরুত্ব দিয়ে দেখেছি। এখনকার codebase-এ মূল সমস্যা হলো page click করার পরে data fetch শুরু হয়, তাই route সঙ্গে সঙ্গে open হলেও content 3-10 second পরে আসে। আর `/app/dashboard`-এ একসাথে অনেকগুলো full-table query চলছে।

### আমি কী build/fix করব

**1) Navigation instant-feel করব**
- `TanStack Query` properly setup করব `src/router.tsx` + `src/routes/__root.tsx`-এ
- route change-এর আগেই data prefetch/caching চালু করব
- `useEffect + setState` ভিত্তিক page load pattern ধীরে ধীরে `queryOptions + ensureQueryData + useSuspenseQuery`-এ নেব
- first load ছাড়া আগের loaded page data cache থেকে প্রায় instantly দেখাবে

**2) Heavy pages optimize করব**
নিচের pageগুলো আগে optimize করব, কারণ এগুলোতে mount হওয়ার পর আলাদা fetch চলছে:
- `src/routes/app.dashboard.tsx`
- `src/routes/app.products.tsx`
- `src/routes/app.stock.tsx`
- `src/routes/app.access.tsx`
- `src/components/app/POSPage.tsx`
- shared auth/shop loading in `src/lib/auth.tsx` and `src/lib/shop.tsx`

**3) Dashboard queries কমাব**
এখন dashboard একসাথে 8টা আলাদা query চালায় (`sales`, `purchases`, `expenses`, `customers`, `suppliers`, `products`, `cash_movements in/out`)। এটা replace করব:
- এক বা অল্প কয়েকটা server-side aggregate query / RPC দিয়ে
- client-এ full row এনে sum করার বদলে database-এই sum/calc করব
- ফলে dashboard অনেক দ্রুত আসবে

**4) Common data cache করব**
বারবার load হওয়া জিনিস cache করব:
- profile
- roles/admin status
- active subscription
- shop list
- current shop-specific lists

এতে menu বদলালে same user/shop info আবার নতুন করে fetch হবে না।

**5) Large list pages efficient করব**
- products/stock/POS-এ full list load pattern refine করব
- search server-side/filter-aware করব যেখানে দরকার
- বড় data থাকলে pagination/limit বা incremental fetch দেব
- POS page-এ product load ও render path হালকা করব

**6) Database index add করব**
বর্তমান filters দেখে targeted index migration দেব, যেমন:
- `products(shop_id, deleted_at, created_at)`
- `sales(shop_id, created_at, deleted_at)` refine if needed
- `purchases(shop_id, created_at, deleted_at)`
- `expenses(shop_id, created_at, deleted_at)`
- `customers(shop_id, deleted_at)`
- `suppliers(shop_id, deleted_at)`
- `cash_movements(shop_id, direction, created_at)`
- `shop_members(shop_id, user_id)`
- `subscriptions(user_id, status, expires_at)`

**7) Access page query chain simplify করব**
`/app/access` এখন owner → members → profiles আলাদা করে fetch করে। এটা optimize করব:
- single shaped query / RPC-তে নামাব
- unnecessary re-fetch কমাব
- same shop revisit করলে cached result দেখাব

**8) UI warnings cleanup করব**
console-এ `DialogContent` description warning আছে। এগুলোও fix করব যাতে needless render noise/debug clutter কমে।

### Cloud / AI / API বিষয়টা
এখানে গুরুত্বপূর্ণ clarification আছে:
- আপনার app code-এর ভিতরে আলাদা AI/API menu আমি পাইনি
- আপনি যে `Cloud` click করে `Supabase`, `AI`, `API` দেখছেন, সেটা Lovable editor/platform UI — app repo-এর অংশ না
- তাই project code change করে ওই editor-level menu remove করা যাবে না
- end-user app-এ এগুলো deploy হয় না

তবে app-এর ভিতরে যদি কোথাও AI/API related button/text থাকে, সেটা আমি scan করে remove/clean করতে পারব। বর্তমানে codebase-এ এমন feature panel পাইনি।

### Technical details

**Observed bottlenecks**
- `src/routes/app.dashboard.tsx`-এ 8 parallel table reads, তারপর client-side summation
- `src/lib/auth.tsx`-এ profile/roles/subscription 3টি query per auth load
- `src/lib/shop.tsx`-এ shop list load globally
- `app.products`, `app.stock`, `app.access`, `POSPage` সবকিছু mount হওয়ার পরে fetch শুরু করছে
- এই architecture-এ click-এর সাথে সাথে page skeleton নয়, data-ready হওয়ার জন্য wait feel হচ্ছে

**Implementation approach**
```text
Current:
click menu -> route mounts -> useEffect runs -> fetch starts -> data returns -> UI shows

After fix:
hover/click menu -> loader/query prefetch -> cached data available -> route opens immediately -> background refresh if needed
```

**Files likely to change**
- `src/router.tsx`
- `src/routes/__root.tsx`
- `src/lib/auth.tsx`
- `src/lib/shop.tsx`
- `src/routes/app.dashboard.tsx`
- `src/routes/app.products.tsx`
- `src/routes/app.stock.tsx`
- `src/routes/app.access.tsx`
- `src/components/app/POSPage.tsx`
- new query helper files under `src/lib/` or `src/hooks/`
- Supabase migration for indexes / aggregate function

### Execution order
1. QueryClient + root integration
2. Auth/shop caching refactor
3. Dashboard aggregation + DB index migration
4. Products/stock/access/POS caching & fetch optimization
5. Dialog warning cleanup
6. Final pass on perceived navigation speed

Approve করলে আমি এই optimization plan implement করব।