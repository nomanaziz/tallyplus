## লক্ষ্য

Tally Plus-কে hybrid offline-first অ্যাপ বানানো:
- Internet না থাকলেও cached data দেখা যাবে এবং calculation চলবে
- ব্যক্তিগত হিসাব (Money/Loans) এবং ফর্দ draft offline-এ যোগ করা যাবে — internet ফিরলে background-এ Supabase-এ auto-sync হবে
- উপরে clear banner: **"ইন্টারনেট নেই — offline mode"** (PC + mobile উভয়ই)
- App install prompt দোকানদার (Seller dashboard) ও ব্যক্তিগত (Consumer dashboard) দুই জায়গায়

## ১. Offline-capable Service Worker (cache শুরু)

বর্তমান `public/sw.js` শুধু network passthrough — কিছু cache করে না। এটাকে full SW-এ rewrite:

- **App shell precache**: build-এর সময় Vite থেকে `index.html`, JS/CSS chunks, icons → SW install-এ cache হবে
- **Runtime cache** (NetworkFirst, 5s timeout): Supabase REST GET requests (`*.supabase.co/rest/v1/*`) cache-এ পড়বে; offline-এ cache থেকে serve হবে
- **Navigation fallback**: offline + অজানা URL → cached `index.html`
- **Cache versioning**: deploy-এ পুরোনো cache cleanup
- **Preview/iframe guard**: আগের মতোই — Lovable preview-এ SW unregister থাকবে

`vite.config.ts`-এ build hook দিয়ে precache list `sw.js`-এ inject করা হবে (manual, vite-plugin-pwa ছাড়াই — preview interference এড়াতে)।

## ২. Offline write queue (IndexedDB + auto-sync)

নতুন ফাইল: `src/lib/offlineQueue.ts`
- IndexedDB-এ `pending_mutations` store (id, table, op, payload, created_at, retry_count)
- API: `enqueueMutation({ table, op, payload })`, `flushQueue()`, `subscribeQueueState(cb)`
- `online` event বা manual trigger-এ flush — সফল হলে remove, fail হলে retry counter বাড়বে

নতুন hook: `src/lib/useOfflineWrite.ts`
- `writeWithOffline(table, op, payload)` — online হলে সরাসরি Supabase, offline হলে queue + optimistic local cache update

**Supported tables (Hybrid scope):**
- `consumer_transactions` (insert/delete) — ব্যক্তিগত হিসাব
- `consumer_loans` + `consumer_loan_payments` (insert/delete) — ধার দেনা
- ফর্দ draft (sessionStorage থেকে IndexedDB-এ move; offline create করলে queue-এ জমা)

`src/pages/customer/Money.tsx`, `src/components/customer/LoansTab.tsx`, `src/pages/customer/CreateFordo.tsx` → এই hook ব্যবহার করবে।

## ৩. Online/Offline detection + Banner

নতুন: `src/lib/useOnlineStatus.ts` — `online` / `offline` event listen + Supabase health probe (10s interval যখন offline)

নতুন: `src/components/app/OfflineBanner.tsx` — top-এ slim red bar:
- Offline: **"⚠ ইন্টারনেট নেই — offline mode চলছে"**
- Reconnecting + sync queue size থাকলে: **"🔄 N টি পরিবর্তন sync হচ্ছে..."**
- Sync done হলে toast: **"✓ সব offline পরিবর্তন cloud-এ সংরক্ষণ হয়েছে"**

`src/main.tsx`-এ `<OfflineBanner />` mount হবে।

## ৪. Install prompt: Consumer + Seller dashboard-এ

বর্তমান `InstallAppPrompt` শুধু global bottom prompt + header button। এতে কাজ আরো বাড়ানো:

- নতুন dismissible card component: `<InstallAppCard />` — "📱 অফলাইনেও কাজ করতে অ্যাপ install করুন" + একটা বড় Install button
- Place করব: 
  - `src/pages/customer/Dashboard.tsx` (ব্যক্তিগত top)
  - Seller dashboard top (find করব — সম্ভবত `src/pages/Dashboard.tsx` বা similar)
- 7 দিনের জন্য "পরে দেখাবো" — localStorage-এ dismiss flag

## ৫. Limitation user-কে জানানো

Plan complete হওয়ার পর notes-এ থাকবে:
- Offline write শুধুই ব্যক্তিগত হিসাব, ধার, ফর্দ draft-এর জন্য
- POS sale, invoice, payment receive — এগুলো এখনো online-only (পরে চাইলে যোগ করা যাবে)
- Install prompt শুধু **published site** (`tallyplus.lovable.app`) বা desktop Chrome/Edge-এ কাজ করবে — Lovable preview iframe-এ নয়

## প্রভাবিত ফাইল

**নতুন:**
- `src/lib/offlineQueue.ts`
- `src/lib/useOfflineWrite.ts`
- `src/lib/useOnlineStatus.ts`
- `src/components/app/OfflineBanner.tsx`
- `src/components/app/InstallAppCard.tsx`

**পরিবর্তন:**
- `public/sw.js` — full offline SW
- `src/main.tsx` — `<OfflineBanner />` mount
- `src/pages/customer/Money.tsx` — `useOfflineWrite` ব্যবহার
- `src/components/customer/LoansTab.tsx` — `useOfflineWrite` ব্যবহার
- `src/pages/customer/CreateFordo.tsx` — offline draft support
- `src/pages/customer/Dashboard.tsx` — `<InstallAppCard />`
- Seller dashboard (যেটা পাব) — `<InstallAppCard />`
- `package.json` — `idb-keyval` add (small ~600B IndexedDB wrapper)

**Database:** কোনো migration নেই — offline queue শুধু client-side।
