# তিনটা কাজ — Shop Reset, Profile Edit, Desktop Install Button

## ১. Profile Edit (নাম, ফোন, ঠিকানা পরিবর্তন)

**নতুন page:** `/app/profile`
- Owner নিজের `profiles` row edit করতে পারবে: `full_name`, `phone` (read-only — auth.users থেকে), `address`, `country_code`, optional avatar
- Zod validation: name 2-100 char, phone format, address ≤ 200 char
- Save → `profiles` table update (RLS already covers self-update)
- SettingsSheet-এ একটা নতুন entry: **"আমার প্রোফাইল"** (top, profile picture-এর নিচে)

## ২. Shop Reset + Backup/Restore

**SettingsSheet → "Danger Zone" section** এ ৩টা button:
- **দোকানের তথ্য Edit** — shop name, address, phone, logo update (`shops` table)
- **Backup নিন** — পুরো dataset JSON download
- **দোকান Reset করুন** — confirm dialog (টাইপ "RESET" + shop name) → সব data মুছে যাবে, shop টিকে থাকবে

### Backup format (JSON file)

```
{
  "version": 1,
  "exported_at": "...",
  "shop": { name, address, phone, currency, shop_type_code },
  "tables": {
    "categories": [...],
    "products": [...],
    "customers": [...],
    "suppliers": [...],
    "services": [...],
    "expenses_categories": [...],
    "shop_delivery_zones": [...]
    // optional: sales/purchases/expenses/payments যদি user চায়
  }
}
```

Two backup modes via checkbox:
- **শুধু Master data** (products, customers, suppliers, categories, services) — restore-friendly
- **সবকিছু** (transactions সহ) — পুরো archive, কিন্তু restore-এ skip হবে transaction lines (নতুন shop-এ duplicate id problem এড়ানোর জন্য)

### Reset flow (Edge Function `shop-reset`)

Edge function admin-priv দিয়ে এই tables থেকে `shop_id = X` rows hard-delete করবে:
`sales_items, sales, purchases_items, purchases, expenses, payments, cash_movements, products, categories, customers, suppliers, services, service_bookings, customer_wishlists, customer_wishlist_items, online_orders, online_order_items, shop_delivery_zones, returns, ...` (প্রকৃত list pre-flight query করে নেব)

- `shops` row নিজে delete হবে না — owner & settings অক্ষুণ্ণ
- নতুন default delivery zones trigger আবার seed করে দেবে (already exists)
- Audit log: `shop_reset_logs` table — কে, কখন, কোন shop reset করল

**Validation (DB-side):** RPC `request_shop_reset(_shop_id, _confirmation_text)` — only owner, confirmation must equal shop name।

### Restore/Import (`Backup নিন` page বা separate Import button)

- File upload → JSON parse → **Zod schema validation** (version, table shapes, required fields)
- Preview dialog: কতটা product/customer/etc import হবে দেখাবে, conflict (duplicate name/SKU) flag করবে
- Per-row validation — যেকোনো error থাকলে "ঠিক করে আবার upload করুন" message + error rows-এর line number list
- Atomic insert via Edge Function `shop-restore` (transaction)

## ৩. Desktop PWA Install Button (address bar pasher icon)

**সমস্যা:** Chrome desktop install icon তখনই দেখায় যখন PWA installability criteria পুরোপুরি পূরণ হয় — এর মধ্যে গুরুত্বপূর্ণ:
- valid `manifest.webmanifest` ✅ (আছে)
- registered service worker with `fetch` handler ❌ (নেই — `rg` দিয়ে service worker খুঁজে পাইনি)
- HTTPS ✅
- 192x192 ও 512x512 icons ✅

**Fix:**
1. **Vite PWA plugin add:** `bun add -D vite-plugin-pwa workbox-window`
2. `vite.config.ts`-এ `VitePWA({ registerType: 'autoUpdate', manifest: ... , workbox: { ... } })` plugin add
3. `src/main.tsx`-এ service worker registration (`registerSW({ immediate: true })`)
4. Existing `public/manifest.webmanifest` plugin manifest-এর সাথে merge (duplicate avoid)
5. Manifest-এ `id: "/"` add (Chrome desktop-এ install button reliably দেখাতে সাহায্য করে)

এর পর Chrome address bar-এ install icon (computer + arrow) দেখাবে।

## Files

**New:**
- `src/pages/app/Profile.tsx`
- `src/pages/app/ShopSettings.tsx` (shop name/address edit + backup + reset)
- `src/components/app/ResetShopDialog.tsx`
- `src/components/app/RestoreBackupDialog.tsx`
- `src/lib/backup.ts` (export/import + Zod schemas)
- `supabase/functions/shop-reset/index.ts`
- `supabase/functions/shop-restore/index.ts`
- Migration: `request_shop_reset` RPC + `shop_reset_logs` table

**Edited:**
- `src/components/app/SettingsSheet.tsx` (নতুন entries: Profile, Shop Settings, Backup, Reset)
- `src/lib/app-routes.tsx` (২টা route)
- `vite.config.ts` (VitePWA plugin)
- `src/main.tsx` (registerSW)
- `public/manifest.webmanifest` (add `id`)

## Validation Highlights

- All forms: Zod schemas, trim, length limits, Bengali error messages
- Restore: per-table schema check, foreign key sanity check (parent_id existence), price/qty numeric check, duplicate name detection
- Reset: double confirmation (type shop name) + RPC re-checks ownership
