# Offline-first রূপান্তর + Sync Indicator (LPG দিয়ে শুরু)

আপনার project এ already offline এর basic ভিত্তি আছে (`src/lib/offlineQueue.ts`, `useOfflineWrite.ts`, `public/sw.js`, `OfflineBanner`). কিন্তু:

- Sync status header এ visible নয় — শুধু উপরে একটা পাতলা banner আছে।
- বেশিরভাগ write এখনো সরাসরি `supabase.from(...)` দিয়ে হয়, queue এ যায় না।
- Read গুলো offline এ properly fall back করে না (cache থাকলেও UI "Loading..." এ আটকে যায়, যেটা আপনার screenshot এও দেখা যাচ্ছে)।
- First-load pre-cache নেই, তাই নতুন device এ offline এ ঢুকলে data পাবে না।

কাজটা বড়, তাই আমি **৩ phase** এ ভাগ করছি। এই plan এ Phase 1 (Global sync UX) + Phase 2 (LPG module পুরোটা offline) ধরা হচ্ছে। বাকি module গুলো পরে একই pattern এ যাবে।

---

## Phase 1 — Global Sync Indicator + First-load Loader

Reference app এর মতো header এ একটা wifi-style icon থাকবে:

- 🟢 **সবুজ** — online + queue খালি (সব sync)
- 🟠 **কমলা + badge সংখ্যা** — pending changes (offline বা sync হয়নি)
- 🔵 **নীল ঘূর্ণায়মান** — sync চলছে
- ⚪ **ধূসর crossed** — পুরো offline, queue ও খালি

Click করলে manual flush + status toast।

### Files
- New: `src/components/app/SyncStatusButton.tsx` — icon button, queue size + online state দেখাবে, click এ `flushQueue()` চালাবে।
- Edit: `src/components/app/AppTopbar.tsx` — language switcher এর পাশে `SyncStatusButton` বসাবে।
- Edit: `src/components/app/OfflineBanner.tsx` — slim করে শুধু critical state এ দেখাবে (header icon থাকায় duplicate কমবে)।
- New: `src/components/app/FirstLoadGate.tsx` — first visit এ একটা full-screen loader: "প্রথমবার load হচ্ছে... অ্যাপ offline এ ব্যবহার করতে এই step লাগবে।" Progress dots সহ। Done হলে `localStorage` flag set।
- Edit: `src/pages/app/AppLayout.tsx` — `FirstLoadGate` mount, pre-cache trigger।
- New: `src/lib/offlineCache.ts` — IndexedDB এ shop-scoped read cache (products, suppliers, customers, bottle_types, ইত্যাদি)। `cachedQuery(key, fetcher)` helper যা online এ network থেকে এনে cache করে, offline এ cache থেকে দেয়।
- Edit: `public/sw.js` — version bump v4, navigation fallback message বাংলায় টেনে আনা ও pre-cache list আরও তালিকাভুক্ত।

### Technical
- Reuse: `useOnlineStatus`, `getQueueSize`, `onQueueChange`, `flushQueue`.
- Pre-cache: প্রথম successful load এ shop এর hot tables (products, suppliers, contacts, bottle_types, holdings, delivery_men, recent movements) IndexedDB এ rows সহ store।
- Cache TTL: 7 দিন, refresh on each online load।

---

## Phase 2 — LPG Module পুরোটা Offline-First

আপনি যেহেতু LPG দিয়ে শুরু করতে বললেন, ওটার সব tab offline এ পুরোপুরি কাজ করবে।

LPG এ এই section গুলো আছে (একই module — LPG ও water bottle): bottle types, refill bookings, deliveries, holdings, cylinder deposits, supplier dues, brand balance, sales returns, refill movements, marketplace।

### প্রতিটা view এর জন্য
- **Read**: `cachedQuery()` দিয়ে — online এ network + cache update; offline এ cache থেকে instant render, top এ "📦 offline data দেখাচ্ছেন" hint।
- **Write/Delete**: সব mutation `writeWithOffline()` দিয়ে rewrite — offline এ queue হবে, UI optimistically update হবে।
- **Optimistic merge**: render এর সময় cached rows + pending-insert rows merge, pending row এ subtle 🕓 badge।

### Files (Phase 2)
- Edit: `src/pages/app/Lpg.tsx` — সব tab এর fetch/insert/delete কে cache + queue API তে সরানো।
- New: `src/lib/lpg-offline.ts` — LPG-specific table list, cache keys, pending row merge helpers।
- Touch: relevant LPG dialogs (refill booking, delivery add, holding update) — write path swap।

### Phase 2 এর বাইরে (পরে আসবে)
Products, Sales/POS, Purchase, Contacts, Cashbook ইত্যাদিও একই pattern এ migrate হবে — কিন্তু এই plan এ ধরছি না, যাতে এক batch এ যা commit হয় সেটা testable থাকে। আপনি OK বললে পরের message এ Phase 3 শুরু করব।

---

## যা **পরিবর্তন হবে না**
- Database schema, RLS, edge functions কিছু ছোঁয়া হবে না।
- Auth flow, login pages অপরিবর্তিত।
- Service worker registration পদ্ধতি একই — শুধু cache list বাড়ছে।

---

## প্রশ্ন (build শুরুর আগে)
1. **Scope confirm**: Phase 1 + LPG দিয়ে শুরু করি, পরের লুপে অন্যান্য module migrate করি — ঠিক আছে?
2. **First-load loader**: একদম প্রথম login এ একবার দেখাব (reference এর মতো)। পরে আর না — ঠিক?
3. **Icon position**: language switcher (🌐 বাং) এর ঠিক পাশে wifi icon, screenshot এর মতো — confirm?
