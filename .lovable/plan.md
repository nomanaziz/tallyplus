# Admin Web Push Notifications

ব্রাউজার-based Web Push (VAPID) দিয়ে যেসব user app open/install করেছে তাদের কাছে admin portal থেকে notification পাঠানোর system। Segment করা যাবে: All / Installed PWA / Web browser / Mobile browser / Desktop browser।

## 1. Database (migration)

নতুন table `push_subscriptions`:
```
id          uuid PK
user_id     uuid null  -- যদি logged-in হয়, না হলে anonymous
endpoint    text unique not null
p256dh      text not null
auth        text not null
display_mode text  -- 'standalone' (installed PWA) | 'browser'
device_type text   -- 'mobile' | 'desktop' | 'tablet'
user_agent  text
language    text   -- 'bn' | 'en'
last_seen_at timestamptz default now()
created_at  timestamptz default now()
revoked_at  timestamptz null
```
Index: `(display_mode)`, `(device_type)`, `(user_id)`.
RLS:
- INSERT/UPDATE: anyone (anon/auth) can upsert their own endpoint (`with check true`); UPDATE only by matching endpoint via RPC.
- SELECT/DELETE: admin-only (`is_admin(auth.uid())`).

নতুন table `push_campaigns`:
```
id, title, body, url, icon, target_segment jsonb,
sent_count int, failed_count int,
sent_by uuid, created_at timestamptz
```
RLS: admin only।

RPC `upsert_push_subscription(_endpoint, _p256dh, _auth, _display_mode, _device_type, _ua, _lang)` SECURITY DEFINER — anyone can call, sets `user_id = auth.uid()` (or null)।

## 2. Service worker (`public/sw.js`)

বর্তমান passthrough SW-এ যোগ:
- `push` event → parse JSON `{title, body, url, icon}` → `self.registration.showNotification(...)`
- `notificationclick` → `clients.openWindow(url)` বা existing tab focus
- Default icon: `/logo.png`, badge: `/badge.png`

## 3. Subscription registration (`src/lib/push.ts` — new)

`registerPushSubscription()`:
- `Notification.permission` চেক, prompt
- `navigator.serviceWorker.ready` → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC })`
- detect display_mode (`matchMedia('(display-mode: standalone)')`), device_type (UA), language (i18n)
- POST to `upsert_push_subscription` RPC
- localStorage flag যাতে repeat না হয়

VAPID public key `.env`-এ `VITE_VAPID_PUBLIC_KEY` (publishable, fine in code)।

Trigger: 
- App-এ login successful হলে একটি soft prompt component (`<EnablePushPrompt/>`) যেটা AppLayout-এ একবার দেখাবে
- Settings → Notifications toggle (manual enable/disable)

## 4. Edge function `send-push` (new)

Input: `{ title, body, url?, icon?, segment: { display_mode?, device_type?, user_id? } }`
- Verify caller is admin (`is_admin(auth.uid())`)
- Query `push_subscriptions` filtered by segment, `revoked_at is null`
- For each: send Web Push using **`web-push` via npm:** import (`import webpush from "npm:web-push@3"`) with VAPID keys from `Deno.env`
- 410/404 response → mark `revoked_at = now()`
- Insert row into `push_campaigns`

Secrets needed:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (e.g. `mailto:admin@tallyplus.app`)

## 5. Admin UI: `src/pages/admin/PushNotifications.tsx` (new route `/admin/push`)

- Form: Title, Body, URL (optional), Icon URL (optional)
- Segment chips (multi-select):
  - All / Installed only / Web browser only / Mobile only / Desktop only / Logged-in users only
- Live audience count (queries `push_subscriptions` with selected filter)
- "Send Test to Me" button
- "Send Now" button → calls `send-push` edge function → shows sent/failed counts
- History table: last 50 `push_campaigns` rows with sent_count/failed_count

Sidebar entry in `src/pages/admin/Index.tsx` (admin nav) + route in `app-routes.tsx`।

## 6. Files

| File | Type |
|---|---|
| `supabase/migrations/<ts>_push.sql` | NEW — tables, RLS, RPC |
| `public/sw.js` | EDIT — push + notificationclick handlers |
| `src/lib/push.ts` | NEW — subscribe/unsubscribe helpers |
| `src/components/app/EnablePushPrompt.tsx` | NEW |
| `src/pages/app/AppLayout.tsx` | EDIT — mount prompt |
| `src/components/app/SettingsSheet.tsx` | EDIT — notification toggle |
| `src/pages/admin/PushNotifications.tsx` | NEW |
| `src/pages/admin/Index.tsx` | EDIT — sidebar link |
| `src/lib/app-routes.tsx` | EDIT — `/admin/push` route |
| `supabase/functions/send-push/index.ts` | NEW — VAPID send |
| `.env` | add `VITE_VAPID_PUBLIC_KEY` |

## 7. Secrets to add (after approval)

`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — generated via `npx web-push generate-vapid-keys`। Approval পেলে আমি keys generate করার একটা one-shot script চালাবো এবং তারপর secrets add request পাঠাবো।

## Notes / Limitations

- iOS Safari Web Push: শুধু **installed PWA** (Add to Home Screen)-এ কাজ করে — segment "Installed only" এই device গুলাও পাবে। Regular iOS Safari tab subscribe করতে পারবে না (browser limitation)।
- Android Chrome/Firefox/Edge: web tab + installed PWA দুটাই কাজ করবে।
- Desktop: Chrome/Edge/Firefox কাজ করবে।