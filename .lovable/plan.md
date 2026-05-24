# Phase 3 — বাকি Module গুলোকে Offline-first করা

Phase 1+2 এ যা হয়েছে: global sync icon, IDB read cache (`cachedQuery`), write queue (insert/delete), LPG পুরো module offline।

Phase 3 এ বাকি core module: **Products, Contacts, Cashbox, Dashboard, POS (Sales+Purchase)**।

কাজের আগে একটা গুরুত্বপূর্ণ সীমাবদ্ধতা: বর্তমান `offlineQueue` শুধু `insert` ও `delete` queue করতে পারে — `update` পারে না। কিন্তু Products এ stock update, customer due_balance update, soft-delete (update deleted_at), POS এ cash/stock movement — এই সবেই update লাগে। তাই Phase 3 শুরু হবে queue এ `update` support যোগ করে।

---

## 3a — Foundation: queue এ update support

### Files
- Edit: `src/lib/offlineQueue.ts` — `QueueOp` এ `"update"` যোগ, flush logic এ update path।
- Edit: `src/lib/useOfflineWrite.ts` — `op: "update"` handle, payload + matchOn দিয়ে eq filter।

### Technical
- Update payload schema: `{ set: {...}, match: {...} }` — match columns দিয়ে row select, set দিয়ে fields update।
- Flush order preserved: createdAt ascending (already done) — তাই insert→update→insert sequence ঠিক থাকে।

---

## 3b — সহজ Pages (read-cache + simple write)

### Cashbox (`src/pages/app/Cashbox.tsx`)
- Read: cash_movements, accounts → `cachedQuery`।
- Write: `cash_movements.insert` → `writeWithOffline`।

### Contacts (`src/pages/app/Contacts.tsx`)
- Read: customers, suppliers, staff → `cachedQuery`।
- Delete: `shop_members.delete` → `writeWithOffline`।
- New customer/supplier add (যদি এই page এ থাকে) → queue।

### Dashboard (`src/pages/app/Dashboard.tsx`)
- Read-only। সব stat fetcher `cachedQuery` দিয়ে wrap, offline এ last cached summary দেখাবে। Top এ একটা subtle "📦 offline ডেটা" pill।

---

## 3c — Products (`src/pages/app/Products.tsx`)

LPG-এর মতোই complete migration:
- Read: products, categories, brands → `cachedQuery`।
- Create/Edit (line 1403-1404): `products.insert` / `products.update` → `writeWithOffline`।
- Soft-delete (line 288): `products.update({deleted_at})` → `writeWithOffline` (update op)।
- Stock adjust (line 413, 445): `products.update({stock})` + `stock_movements.insert` → দুটোই queue।
- Optimistic UI: offline এ যোগ/edit করা product list এ সাথে সাথে দেখাবে, একটা ছোট 🕓 badge সহ।

---

## 3d — POS (`src/components/app/POSPage.tsx`) — **partial offline**

POS sale একটা multi-step transaction:
1. `sales.insert`
2. `sale_items.insert` (uses returned sale_id)
3. `stock_movements.insert` (each item)
4. `cash_movements.insert`
5. `customers.update due_balance` (read then write)
6. `service_warranties.insert` (if applicable)

পুরোপুরি offline করতে গেলে চ্যালেঞ্জ:
- Step 2-6 step-1 এর returned ID এর উপর নির্ভরশীল।
- Step 5 এ read-then-write race condition (যদি অন্য device থেকেও বিক্রি হয়)।

### আমার পদ্ধতি
- offline এ POS sale **client-side e UUID generate করব** (sale_id = crypto.randomUUID())।
- সব step গুলো একই order এ queue করব — flush একই sequence এ DB তে যাবে।
- due_balance update এর জন্য: cached customer row এ delta apply করব locally, একই সাথে server এ queue করব `update` op হিসেবে। Server এ race থাকলে eventually consistent — যেহেতু sale একটাই owner device থেকে আসছে, এটা acceptable।
- offline বিক্রির সময় invoice print/share এর জন্য locally-generated ID ব্যবহার হবে।
- Receipt page এ একটা banner: "এই বিক্রি offline এ হয়েছে — অনলাইনে এলে cloud-এ সংরক্ষণ হবে।"

### Files
- Edit: `src/components/app/POSPage.tsx` — sale + purchase flow দুটোই queue-based হবে।
- Edit: `src/lib/useOfflineWrite.ts` — `insert` op এ pre-generated id সাপোর্ট (already works since payload allows id field)।

---

## যা **পরিবর্তন হবে না**
- DB schema, RLS, edge functions।
- LPG (Phase 2 এ হয়ে গেছে)।
- Reports / Ledger pages — এগুলো শুধু read। পরে dashboard pattern এ যাবে।
- Auth, login, settings।

---

## প্রশ্ন (build শুরুর আগে)

1. **POS offline এর scope**: উপরের ৫টা step পুরোটা queue হবে (সরল cases — discount, partial payment ইত্যাদি)। কিন্তু advance payment, multi-currency, complex due adjustment এর মতো edge cases offline এ আমি **block** করব ("এই বৈশিষ্ট্য অনলাইনে দরকার" toast)। ঠিক আছে?

2. **Stock conflict**: একই product দুই device থেকে offline এ বিক্রি হলে stock নেগেটিভ হতে পারে। আমি just allow করব (server-side stock recalculation আছে আগের code এ)। কোনো block লাগবে কি?

3. **Scope**: এই প্ল্যান বেশ বড় — Cashbox + Contacts + Dashboard + Products + POS। চাইলে আমি ৩b (সহজগুলো) আগে এক batch এ deliver করি, তারপর Products আলাদা, POS আলাদা — যেহেতু POS সবচেয়ে complex। আপনার preference?
