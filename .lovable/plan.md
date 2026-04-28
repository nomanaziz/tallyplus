# Privacy Policy ও Terms and Conditions পেজ যোগ করা

## যা যা করা হবে

### ১. দুইটি নতুন পাবলিক পেজ তৈরি
- **`src/pages/Privacy.tsx`** — Privacy Policy পেজ
- **`src/pages/Terms.tsx`** — Terms & Conditions পেজ

দুইটি পেজেরই গঠন main website-এর সাথে consistent থাকবে:
- উপরে `SiteHeader`
- মাঝখানে container-এ পরিষ্কার typography (heading, sections, bullet list) — Tally+ব্র্যান্ড style অনুযায়ী
- নিচে `SiteFooter`
- `useI18n()` ব্যবহার করে **বাংলা ও English উভয় ভাষায়** content দেখানো হবে (যেভাবে বাকি site কাজ করে)

### ২. Content (Tally+ context অনুযায়ী লেখা হবে)

**Privacy Policy** — যে topics কভার হবে:
- কী ধরনের তথ্য সংগ্রহ করা হয় (নাম, mobile, shop info, transaction data)
- কীভাবে ব্যবহার করা হয়
- তথ্য সংরক্ষণ ও security
- Third-party services (Supabase, payment gateway)
- Cookies
- User rights (delete, export)
- যোগাযোগের ঠিকানা

**Terms & Conditions** — যে topics কভার হবে:
- Service-এর পরিচয় ও eligibility
- Account ও subscription নিয়ম
- Payment, refund, cancellation policy
- Acceptable use
- Intellectual property
- Liability disclaimer
- Termination
- পরিবর্তনের অধিকার ও governing law

### ৩. Routing
`src/routes.tsx`-এ দুইটি route যোগ:
- `/privacy` → `Privacy.tsx`
- `/terms` → `Terms.tsx`

(Lazy loaded, বাকি page-এর pattern অনুযায়ী)

### ৪. Footer-এ link যোগ
`src/components/site/SiteFooter.tsx`-এ existing link row-এ দুটি নতুন link বসবে:
- **Privacy Policy / প্রাইভেসি পলিসি**
- **Terms & Conditions / শর্তাবলী**

`Link` component ব্যবহার করে `/privacy` ও `/terms`-এ পাঠাবে, hover style বাকিদের মতই।

## পরিবর্তিত/তৈরি হবে যে file গুলো
- নতুন: `src/pages/Privacy.tsx`
- নতুন: `src/pages/Terms.tsx`
- edit: `src/routes.tsx`
- edit: `src/components/site/SiteFooter.tsx`
