
## লক্ষ্য

`SettingsSheet`-এর "অন্যান্য" section (গ্রোথ পার্টনার, ফেসবুক কমিউনিটি, হেল্প ও সাপোর্ট) – এই সব link এখন code-এ hardcoded। এগুলো admin panel থেকে editable করব। এছাড়া version line থেকে hardcoded `3.2.1` সরিয়ে build-time auto-detect করব।

## যা যা হবে

### 1. Database — `app_links` table (admin-managed)

নতুন table, admin-only edit, public read:

```text
app_links
├─ key (text, PK)        — যেমন: 'growth_partner', 'facebook_community', 'help_support'
├─ label_bn (text)
├─ label_en (text)
├─ url (text)            — external URL বা internal route (যেমন '/app/affiliate')
├─ link_type (text)      — 'internal' | 'external'
├─ icon (text)           — lucide icon নাম (যেমন 'Users', 'Facebook', 'HelpCircle')
├─ section (text)        — আপাতত শুধু 'other'
├─ sort_order (int)
├─ is_active (boolean)
└─ updated_at (timestamptz)
```

- RLS: `select` সবাই (anon সহ), `insert/update/delete` শুধু `has_role(auth.uid(),'admin')`
- Seed করব 3টা default row যাতে কিছু না-করলেও current behavior অপরিবর্তিত থাকে

### 2. Admin UI — `/admin/settings` revamp

বর্তমান placeholder card-কে replace করে একটা পূর্ণ "App Links" manager:
- টেবিল: label (bn/en), URL, type, icon, sort, active toggle
- Add/Edit/Delete dialog
- Drag-handle বা up/down button দিয়ে sort পরিবর্তন

### 3. SettingsSheet refactor

- "অন্যান্য" section আর hardcoded থাকবে না — `app_links` থেকে fetch করে render হবে (`useQuery`)
- icon name → lucide component map (small whitelist)
- internal link হলে `nav({to})`, external হলে `window.open(url, '_blank')`
- Loading-এ skeleton, fail হলে section hide

### 4. Version auto-detect

- Hardcoded `3.2.1` সরিয়ে `package.json`-এর `version` field use করব via Vite's `define`:
  - `vite.config.ts`-এ `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`
  - `src/vite-env.d.ts`-এ `declare const __APP_VERSION__: string`
- "OS: Web" badge রেখে দেব (এটা platform indicator, version না)
- Display: `ভার্সন : {__APP_VERSION__}`

## Technical details

- Migration: নতুন `app_links` table + RLS + 3 seed row
- File changes:
  - নতুন migration SQL
  - `src/integrations/supabase/types.ts` (auto-regen)
  - `src/components/app/SettingsSheet.tsx` — "Other" section dynamic + version variable
  - `src/routes/admin.settings.tsx` — full CRUD UI
  - `vite.config.ts` + `src/vite-env.d.ts` — version inject
- Icon map: `Users, Facebook, HelpCircle, MessageCircle, Globe, Youtube, BookOpen, Mail` (admin select থেকে বাছবে; unknown হলে fallback `LinkIcon`)

## যা আমি করব না

- "অ্যাপ সেটিংস" section-এর জিনিস (language, currency, theme, decimal, dashboard, subscription, mobile app, training) — এগুলো user-preference বা core feature, admin link না
- "Switch Shop" button এবং Logout — অপরিবর্তিত

Approve করলে শুরু করব।
