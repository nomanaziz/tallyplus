# Hero Section: Replace image with inline Login/Signup form

ব্যবহারকারী চান হোমপেজের hero এর ডান পাশে যেই দোকানদারের ছবি আছে সেটা সরিয়ে দিয়ে সেখানে একটা সুন্দর login / create-account form বসানো হোক — যাতে গ্রাহক বা দোকানদার সরাসরি homepage থেকেই login/signup করে কাজ শুরু করতে পারেন। `/auth` পেজটা আগের মতই থাকবে।

## What will change

**File: `src/components/site/HeroSection.tsx`**
- ডান কলামের `<img>` (hero shop image) এবং চারপাশের floating chips সরানো হবে।
- ওই জায়গায় একটা card-style inline auth widget বসবে — যার design `src/pages/Auth.tsx`-এর form-এর মতই হবে (একই rounded-2xl card, একই tabs)।

**Already-logged-in state:**
- `useAuth()` দিয়ে check করে, যদি user আগে থেকেই login করা থাকে তাহলে form-এর জায়গায় ছোট একটা welcome card দেখাবে: "স্বাগতম, [name]" + "Dashboard-এ যান" button (`/app/dashboard` বা customer হলে `/customer/dashboard`)।

## The inline form (new component)

নতুন একটা component বানানো হবে: `src/components/site/HeroAuthCard.tsx` — যাতে HeroSection পরিষ্কার থাকে। এতে থাকবে:

- **Mode toggle** (top): দুটো ছোট tab — "লগইন" / "নতুন Account"
- **Role tabs**: "দোকানদার" / "গ্রাহক" (Auth.tsx-এর মতই)
- **Fields:**
  - Login mode: মোবাইল নম্বর + ৪-সংখ্যার PIN
  - Signup mode: নাম + (owner হলে) দোকানের নাম + ShopTypePicker + মোবাইল + PIN
- **Primary button**: লগইন / Account তৈরি করুন
- **Secondary links**:
  - "PIN ভুলে গেছেন? WhatsApp করুন" (admin number থেকে — `affiliate_settings.password_reset_whatsapp` বা fallback)
  - একটা ছোট link "পুরো Login পেজে যান →" → `/auth` (যারা আলাদা পেজে যেতে চান)

## Logic reuse

`Auth.tsx`-এর সব backend logic হুবহু reuse করা হবে — কোনো নতুন edge function লাগবে না:
- `signup-with-pin` (owner signup)
- `customer-signup-with-pin` (customer signup)
- `login-with-pin` (owner login)
- `customer-login-with-pin` (customer login)
- Phone normalize, PIN validation, error toasts — সব same।
- Successful login হলে `useNavigate` দিয়ে owner হলে `/app/dashboard`, customer হলে `/customer/dashboard`-এ পাঠাবে।
- Owner signup-এ "sample product import" prompt দেখাতে চাইলে আগের মতই localStorage flag set করে dashboard-এ পাঠাবে।

## Layout / Responsive

- **Desktop (md+)**: বাম দিকে আগের headline + CTA buttons + stats যেমন আছে তেমনই থাকবে। ডান কলামে hero image এর জায়গায় form card বসবে (max-w-md, একই rounded-3xl shadow look)।
- **Mobile**: form card headline-এর নিচে full-width স্ট্যাক হবে (আগে যেমন image নিচে যেত)।
- বাম পাশের "Get Started" button টাও থাকবে — কিন্তু label change হবে "নিচের form-এ Account তৈরি করুন" feel দিতে; অথবা button টা রেখেই দেওয়া যায় যারা scroll করে পুরো features দেখতে চান।

## Files touched

- `src/components/site/HeroSection.tsx` — ডান কলাম replace
- `src/components/site/HeroAuthCard.tsx` — **নতুন file**, Auth.tsx-এর form logic-এর leaner version

## Out of scope

- `/auth` পেজে কোনো change নেই — সেটা আগের মতই থাকবে।
- নতুন কোনো DB migration বা edge function লাগবে না।
- Image asset (`hero-shop.jpg`) project-এ থাকবে; শুধু hero থেকে remove হবে।
