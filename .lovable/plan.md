
# Shop Reset / Delete — Snapshot, Paid Restore, Admin Recycle Bin

## Goal (in plain Bangla)

- কেউ shop **Reset** বা **Delete** করলে সেই shop-এর সম্পূর্ণ data-র একটা snapshot Admin-এর কাছে জমা থাকবে।
- প্রতি user-এর শেষ **৩টা reset snapshot** ও যেকোনো **delete snapshot** সংরক্ষিত হবে — সর্বোচ্চ **৩০ দিন**, এরপর auto-purge।
- Owner চাইলে Admin-এর কাছে **Restore Request** পাঠাতে পারবে। Admin payment confirm করার পর restore হবে:
  - **Reset restore: ৳৫০০**
  - **Delete restore: ৳১০০০**
- Restore-এর সময় option: (a) শুধু পুরোনো data ফেরত (default), (b) পুরোনো + পরবর্তী নতুন data merge।
- Delete restore-এ যদি owner-এর shop slot full থাকে (plan limit), তাকে **১ মাস free grace** দেওয়া হবে — এর মধ্যে subscription upgrade/visibility ঠিক না করলে shop আবার hidden হয়ে যাবে।
- Admin panel-এ আলাদা **Recycle Bin** থাকবে: Reset snapshots, Delete snapshots, Restore requests, Payments — সব আলাদা tab-এ।

---

## Database (migration)

### 1. Snapshot store

```text
shop_snapshots
  id uuid pk
  shop_id uuid
  shop_owner_id uuid
  shop_name text, shop_meta jsonb       -- name/phone/address/logo/currency/etc.
  kind text check ('reset' | 'delete')
  payload jsonb                         -- full per-table dump (see below)
  summary jsonb                         -- {products: 120, sales: 450, ...}
  size_bytes int
  performed_by uuid
  created_at timestamptz default now()
  expires_at timestamptz                -- created_at + 30 days
  status text default 'available'       -- available | restored | expired | purged
  restored_at timestamptz
  restored_by uuid
```

`payload` contains arrays of rows for every shop-scoped table the existing `request_shop_reset` already touches (products, sales, sale_items, purchases, purchase_items, customers, suppliers, expenses, other_income, payments, cash_movements, owner_transactions, stock_movements, product_serials, services, service_*, categories, assets, marketplace_*, quotations, customer_wishlists, sms_history, shop_delivery_zones, fraud_check_logs, etc.) plus `shop` row itself for delete-kind.

### 2. Restore requests + payments

```text
shop_restore_requests
  id uuid pk
  snapshot_id uuid -> shop_snapshots(id)
  shop_id uuid, requested_by uuid
  kind text ('reset' | 'delete')
  merge_mode text ('replace' | 'merge') default 'replace'
  amount_bdt int                        -- 500 or 1000
  status text                           -- pending | awaiting_payment | paid | approved | restored | rejected | expired
  payment_ref text, paid_at timestamptz
  admin_note text
  created_at, updated_at timestamptz
  decided_by uuid, decided_at timestamptz
```

### 3. Settings (admin tunable)

```text
shop_restore_settings (singleton row id=true)
  reset_price_bdt int default 500
  delete_price_bdt int default 1000
  retention_days int default 30
  max_resets_per_user int default 3
  delete_grace_days int default 30
```

### 4. RPC functions (SECURITY DEFINER)

- `request_shop_reset(_shop_id, _confirm_text)` — **rewrite**: before deleting, build snapshot into `shop_snapshots(kind='reset')`. After insert, prune older reset snapshots for same `shop_owner_id` keeping latest 3. Then run existing cascade DELETEs.
- `request_shop_delete(_shop_id, _confirm_text)` — new: snapshot (kind='delete'), then soft-delete shop (`shops.deleted_at = now()`). The full purge (DB rows actually removed) happens at expiry.
- `submit_restore_request(_snapshot_id, _merge_mode)` — owner-only, creates `shop_restore_requests` row in `awaiting_payment`, returns price.
- `admin_approve_restore(_req_id, _payment_ref)` — admin only. Marks paid → restored. Re-inserts payload rows. For `kind='delete'` also undeletes `shops` row; if owner over plan limit, sets `shops.grace_expires_at = now()+30d` (new column on shops).
- `admin_reject_restore(_req_id, _note)` — admin only.
- `purge_expired_snapshots()` — cron daily: hard-delete snapshots past `expires_at`; for delete-kind also hard-delete the shop row + all leftover shop-scoped rows (reuse cascade list).
- `enforce_shop_grace()` — cron daily: any shop with `grace_expires_at < now()` gets soft-hidden (`is_hidden=true`) until owner upgrades.

### 5. Schedules

`pg_cron` daily at 03:00 UTC: `purge_expired_snapshots()` + `enforce_shop_grace()`.

### 6. RLS

- `shop_snapshots`, `shop_restore_requests`: SELECT — admin OR snapshot's shop_owner_id; INSERT via RPC only; UPDATE admin-only.
- `shop_restore_settings`: SELECT public, UPDATE admin-only.

---

## Frontend changes

### Owner side

- **`src/components/app/ResetShopDialog.tsx`** — keep, but show notice: "এই reset-এর data ৩০ দিনের জন্য Admin-এর কাছে সংরক্ষিত থাকবে। Restore charge: ৳৫০০।"
- **`src/components/app/DeleteShopDialog.tsx`** — same notice with ৳১০০০ + 30-day window.
- **New page `src/pages/app/RestoreRequests.tsx`** (route: `/app/restore-requests`) — lists owner's snapshots:
  - Each row: kind, date, expires-in, summary counts, "Restore Request পাঠান" button.
  - Dialog: choose merge mode (replace default / merge), shows price, confirm → calls `submit_restore_request`.
  - Shows current request status (awaiting_payment / paid / approved / restored / rejected) with admin note.
  - Payment instructions (bKash/Nagad number from existing `payment_gateway_settings` or admin contact).
- Add link in **Shops** page and **ShopSettings** "Danger Zone" → "Reset/Delete History".

### Admin side

- **New page `src/pages/admin/ShopRecycleBin.tsx`** (route: `/admin/shop-recycle-bin`) with 4 tabs:
  1. **Reset Snapshots** — table: shop, owner phone, kind, created, expires, size, summary, "View payload (JSON)", "Manual Restore".
  2. **Delete Snapshots** — same.
  3. **Restore Requests** — pending/paid/approved list with "Mark Paid + Restore" + "Reject" actions, payment_ref input.
  4. **Settings** — edit prices, retention days, max resets per user.
- Add to `AdminSidebar.tsx`.

### Notifications

- New snapshot → notify admins ("নতুন Shop Reset/Delete — owner X").
- New restore request → notify admins.
- Approved/rejected → notify owner via existing `notifications` table.
- Telegram alerts for restore requests + payments (uses existing `telegram-notify` edge function & `TelegramAlerts` admin settings — already added in earlier work).

---

## Edge cases

- **Snapshot size cap**: refuse snapshot > 50MB JSON, fall back to "contact admin" message (rare).
- **Merge mode**: on `merge`, RPC inserts payload rows with new UUIDs (preserve relations via id remap); on `replace`, current shop data is wiped first (only for reset-kind; delete-kind shop is empty anyway).
- **Slot-full on delete restore**: admin sees "owner over limit, grace 30d will apply" — proceed anyway.
- **Already-restored snapshot**: status flips to `restored`, cannot be reused.
- **3-reset cap**: oldest reset snapshot auto-pruned on new reset; deleted snapshots are NOT counted in the 3-cap.

---

## Out of scope (now)

- Auto payment gateway integration for restore charges — Admin manually marks paid (consistent with other admin-approval flows in the app). Can be added later via existing `recharge-create-payment` pattern.

---

## Files touched (estimate)

- 1 migration (~400 lines SQL)
- `src/components/app/ResetShopDialog.tsx`, `DeleteShopDialog.tsx` (notice text + link)
- `src/pages/app/RestoreRequests.tsx` (new)
- `src/pages/admin/ShopRecycleBin.tsx` (new)
- `src/components/admin/AdminSidebar.tsx` (link)
- `src/lib/app-routes.tsx` (2 new routes)
- `supabase/functions/telegram-notify/...` — add restore-request event types (optional, handled via existing notify_admins hook + DB trigger)
