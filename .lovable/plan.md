# SMS API Integration Plan

বাংলাদেশি SMS provider integration — REVE SMS primary, multi-gateway support, template-based sending (custom message বন্ধ), per-shop balance, copy button, এবং buy/history page।

## 1. Database Changes (migration)

নতুন tables:

- **`sms_gateways`** (admin-managed) — multiple SMS provider configs
  - `id`, `provider` (enum: `reve`, `whatsapp`, `telegram`), `display_name`, `is_active`, `is_primary`, `sort_order`
  - `config` (jsonb) — username, password, api_key, secret_key, sender_id (masking/non-masking), base_url
  - `created_at`, `updated_at`
  - RLS: read/write admin only

- **`sms_packages`** (admin-managed) — buy-able SMS packs
  - `id`, `name_bn`, `name_en`, `sms_count`, `price_bdt`, `is_active`, `sort_order`
  - RLS: read public, write admin only

- **`shop_sms_balance`** (per-shop SMS quota)
  - `shop_id` (PK), `balance` (int, default 0), `total_purchased`, `total_used`, `updated_at`
  - RLS: shop members read, only edge function (service role) writes

- **`sms_templates`** (admin-managed allowed templates — user customize করতে পারবে না)
  - `id`, `code` (`due_reminder`, `payment_received`, `sale_invoice`, `promotional`), `name_bn`, `name_en`, `body_template` (with `{name}`, `{amount}`, `{due}`, `{shop}` placeholders), `is_active`
  - RLS: read all authenticated, write admin only

- **`sms_history`** (sent log per shop)
  - `id`, `shop_id`, `gateway_id`, `template_code`, `recipient_phone`, `recipient_name`, `message`, `sms_count`, `status` (`pending`/`sent`/`failed`/`copied`), `provider_message_id`, `error`, `created_at`
  - RLS: shop members read own shop's records, edge function inserts

- **`sms_purchase_requests`** — uses existing `recharge` gateway pattern (mirrors `subscription_requests`)
  - `id`, `shop_id`, `package_id`, `sms_count`, `amount_bdt`, `payment_status`, `recharge_id`, `created_at`, `approved_at`

## 2. Admin UI — `src/pages/admin/SmsGateways.tsx` (new)

Sidebar এ নতুন entry "SMS Gateways"। Page features:
- **Gateway tab**: Dropdown menu দিয়ে provider select (REVE / WhatsApp / Telegram), credentials form (provider-specific), Set Primary toggle, Active toggle। Multiple gateway একসাথে enable করা যাবে।
- **Packages tab**: Add/Edit/Delete SMS packages (name, sms count, price)
- **Templates tab**: View/edit allowed templates with placeholders preview

REVE form fields: Base URL, API Key, Secret Key, Sender ID (callerID), Masking type (Masking/Non-masking dropdown — affects sender ID).

## 3. Edge Function — `supabase/functions/send-sms/index.ts` (new)

Server-side SMS dispatcher:
- Auth: shop member required
- Input: `{ shop_id, template_code, recipients: [{phone, name, vars}] }`
- Logic:
  1. Load primary `sms_gateway` (or specified one)
  2. Load `sms_template` by code → render with vars + shop signature
  3. Check `shop_sms_balance` ≥ total SMS count
  4. For each recipient: call REVE API:
     `GET {base_url}/sendtext?apikey=...&secretkey=...&callerID=...&toUser=88{phone}&messageContent={msg}`
  5. Decrement balance, insert `sms_history` rows
  6. Return per-recipient status

Edge function `add-sms-balance` (admin/recharge callback): credits balance after purchase verification।

## 4. Marketing Page Redesign — `src/pages/app/Marketing.tsx`

Screenshot এর exact layout match:
- Left: Customer/Supplier/Employee tabs with count badge, search, Select All, contact cards with "Add" button
- Right: Phone input (+88 prefix, manual add), MINUTE/SMS BALANCE pills, Buy buttons, Recipients chips, Message preview area
- **Template selector dropdown** (custom message disable — only template select করা যাবে)
- Live preview shows rendered template with shop signature
- Character/SMS count display
- **Copy button** (নতুন) — copies full rendered message to clipboard with toast "Copied! Send from your phone"
- "Send SMS" button → calls `send-sms` edge function (uses balance)
- "Send Voice Message" — placeholder (coming soon)

WhatsApp/Telegram buttons added as additional channel options (placeholder, "coming soon" toast)।

## 5. Buy SMS Page — `src/pages/app/BuySms.tsx` (new, route `/app/buy-sms`)

- Grid of active `sms_packages` cards (sms count, price, savings %)
- Click "Buy" → creates `sms_purchase_requests` row → calls existing `recharge-create-payment` edge function with package amount
- On success callback → `sms_purchase_requests.payment_status='paid'` triggers balance credit
- Current balance display at top

## 6. SMS History Page — `src/pages/app/SmsHistory.tsx` (new, route `/app/sms-history`)

- Date range filter, status filter, template filter, search by phone/name
- Table: Date, Recipient (name + phone), Template, Message preview, SMS count, Status badge, Gateway used
- Pagination (use existing `use-pagination` hook)
- "SMS History" button on Marketing page navigates here

## 7. Routes & Navigation

`src/routes.tsx`: add 3 lazy routes (`/app/buy-sms`, `/app/sms-history`, `/admin/sms-gateways`)
`src/components/admin/AdminSidebar.tsx`: add "SMS Gateways" link
`src/components/app/AppSidebar.tsx`: ensure "Marketing" exists (already does)

## 8. Out of Scope (this turn)

- WhatsApp/Telegram actual sending (UI placeholder only — REVE primary)
- Voice call API (already placeholder)
- Bulk multi-content REVE endpoint (single-content used; can optimize later)

## Files Created/Modified

**New:** migration, `supabase/functions/send-sms/index.ts`, `supabase/functions/sms-purchase-callback/index.ts`, `src/pages/admin/SmsGateways.tsx`, `src/pages/app/BuySms.tsx`, `src/pages/app/SmsHistory.tsx`

**Edited:** `src/pages/app/Marketing.tsx` (template selector + copy button + real send), `src/routes.tsx`, `src/components/admin/AdminSidebar.tsx`

## After Approval

Approve করলে আমি migration run করব (4-5 tables), admin SMS Gateways page, edge function, এবং তিনটা client page বানাব। Admin → SMS Gateways এ গিয়ে আপনি REVE credentials (API key, secret, callerID) save করলেই SMS send কাজ করবে। Packages এবং templates আপনি admin থেকে নিজে define করবেন।