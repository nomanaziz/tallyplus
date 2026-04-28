## Goal

Admin Settings পেজ-এ একটা নতুন **"Site Contact & Social"** section যোগ করব, যেখান থেকে admin manage করতে পারবে:

- Facebook page link
- YouTube channel link
- WhatsApp contact number (general)
- Password-reset WhatsApp number (Auth page-এ "PIN ভুলে গেছেন" বাটনে যাবে)
- Support phone, support email

এই value গুলো main website-এর **Footer**, **Contact section**, এবং **Auth page**-এ live দেখা যাবে।

## Changes

### 1. Database (migration)
- নতুন columns add করব existing `affiliate_settings` table-এ (single-row config table, ইতিমধ্যে support_phone/support_email আছে):
  - `facebook_url text`
  - `youtube_url text`
  - `whatsapp_number text` (general WhatsApp)
  - `password_reset_whatsapp text` (PIN reset-এর জন্য আলাদা নম্বর)
- RLS: admin update করতে পারবে, public read করতে পারবে (already public-readable since Auth page reads it anonymously)।

### 2. Admin UI — `src/pages/admin/Settings.tsx`
- উপরে নতুন একটা **"Site Contact & Social Links"** Card add করব existing "App Links" card-এর আগে।
- Form fields: Facebook URL, YouTube URL, WhatsApp number, Password-reset WhatsApp, Support phone, Support email।
- Save button — single row upsert into `affiliate_settings`।

### 3. Site Footer — `src/components/site/SiteFooter.tsx`
- Footer-এ Facebook, YouTube, WhatsApp icon links add করব (Lucide `Facebook`, `Youtube`, `MessageCircle` icons)।
- Value গুলো `affiliate_settings` থেকে query করে আনব। কোনো URL না থাকলে সে icon hide হবে।

### 4. Contact Section — `src/components/site/ContactSection.tsx`
- Hardcoded `PHONE`/`EMAIL` সরিয়ে dynamic ভাবে `affiliate_settings` থেকে নিয়ে আসব (fallback বর্তমান value)।

### 5. Auth Page — `src/pages/Auth.tsx`
- "PIN ভুলে গেছেন? WhatsApp করুন" বাটনের জন্য `password_reset_whatsapp` field পড়ব (fallback: `support_phone`)।

## Notes

- কোনো নতুন table তৈরি হচ্ছে না — existing `affiliate_settings` extend করছি, তাই admin UI এক জায়গায় সব contact settings থাকবে।
- Public read access ইতিমধ্যে কাজ করছে (Auth page anonymously পড়ছে), তাই RLS-এ extra change লাগবে না।
- Footer/Contact-এ shared hook বানাব `useSiteContact()` যাতে duplicate query না হয়।
