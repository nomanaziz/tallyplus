## কেন এত slow লাগছে — আসল কারণ

আপনার app আসলে "ভারী" না, কিন্তু কয়েকটা specific জায়গায় লোড হওয়ার pattern টা খারাপ। আগের project গুলো instant মনে হত কারণ সেগুলো হয়তো client-only static site ছিল। এই project এ আছে:

1. **Supabase Edge Function (cold start)** — `marketplace-public` function প্রথম call এ "ঘুম থেকে উঠতে" 1.5–4 সেকেন্ড নেয়। প্রতিবার freeze মনে হওয়ার মূল কারণ এটাই।
2. **কোনো loading skeleton/feedback নেই** — click করার পর শুধু সাদা স্ক্রিন বা পুরনো data দেখা যায়, তাই "click হইছে কি না" বোঝা যায় না।
3. **Cache নেই** — marketplace এ প্রতিবার ঢুকলেই নতুন করে fetch হয়, পুরনো data instant দেখায় না।
4. **`/shop` রুটে দুইটা fetch একসাথে চলে** — একই function কে দুইবার hit করছে (vendors + products), যদিও user একটাই view দেখে।
5. **`/auth` page এ login button click করার পর কোনো spinner/disable হয় না** — Supabase auth call চলাকালীন বোঝা যায় না কিছু হচ্ছে।
6. **Marketplace Edge Function inefficient** — আগে সব enabled shop ID আনে, তারপর সেই ID list দিয়ে listings query করে (দুই round-trip)। বড় হলে আরও slow হবে।
7. **Module নয়, architecture সমস্যা** — কোনো "ভারী module" use করা নাই যেটা remove করলে fix হবে। সব সমস্যা data-loading pattern এর।

## কী কী fix করব

### 1. Marketplace fast করা (`/shop`)
- TanStack Router এর **route loader + staleTime** ব্যবহার করে data prefetch ও cache করব। ফিরে এলে instant দেখাবে।
- **Skeleton UI** যোগ করব (গ্রে box গুলো) যাতে freeze না মনে হয়।
- **Active view এর data শুধু fetch হবে** — vendors view এ থাকলে products call হবে না।
- Edge Function এ দুইটা query কে **single JOIN query** তে combine করব (round-trip কমবে)।
- Client-side **debounce** — search type করার সাথে সাথে fetch নয়, 300ms wait।

### 2. Login fast feedback (`/auth`)
- Login button click এ সঙ্গে সঙ্গে **disable + spinner** দেখাব।
- "Loading..." overlay এর বদলে প্রপার full-screen splash যা button থেকে বোঝা যায় কাজ চলছে।

### 3. Dashboard cache
- `/app/dashboard` এ গেলেই query চলে — `staleTime: 60s` দিয়ে প্রতিবার refetch বন্ধ করব।

### 4. Edge Function cold start কমানো (limited)
- Cold start পুরোপুরি যাবে না (Supabase platform limitation), কিন্তু:
  - Function এর response এ `Cache-Control` header যোগ করব যাতে browser সাময়িক cache করে।
  - Single `marketplace-public` function এ multiple round-trip কমাব।

### 5. Visual feedback সব জায়গায়
- Marketplace card grid এর জন্য **skeleton placeholders** (12টা গ্রে box প্রথমে দেখাবে)।
- Login form এ **inline loading state**।
- Top of page এ একটা **thin progress bar** route change এ (TanStack Router এর built-in)।

## আপনার অন্য প্রশ্নের উত্তর

> **"কোন module use করছ যে কারণে slow?"** — কোনো ভারী module না। সমস্যা হল Supabase Edge Function এর cold start + cache নেই + skeleton নেই। Module remove করে fix হবে না।

> **"আগের project click এ instant হত"** — সেগুলো সম্ভবত client-only ছিল (কোনো backend call ছাড়া)। এটা real database থেকে data আনে, তাই network round-trip আছে। তবে fix করার পর অনেক faster লাগবে।

> **"Database query করতে পারছে না?"** — Database কাজ করছে। সমস্যা হল প্রথম call এ Edge Function ঘুম থেকে উঠতে দেরি হয়, এবং কোনো loading indicator নেই বলে freeze মনে হয়।

## Files যেগুলো change হবে

- `src/routes/shop.index.tsx` — loader, skeleton, conditional fetch, debounce
- `src/routes/auth.tsx` — loading button states
- `src/routes/app.dashboard.tsx` — staleTime
- `src/lib/queries.ts` — query options এ caching
- `supabase/functions/marketplace-public/index.ts` — round-trip কমানো, cache headers
- নতুন: `src/components/marketplace/MarketplaceSkeleton.tsx`

## Approve করলে এই fix গুলো আমি একসাথে apply করব। তারপর আপনি refresh দিয়ে দেখবেন marketplace ও login অনেক snappy লাগবে।
