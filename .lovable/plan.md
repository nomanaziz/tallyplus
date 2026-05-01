
## লক্ষ্য

1. Facebook-এর মতো — সাইটে ঢুকলে যদি logged-out থাকে → সরাসরি Login/Signup স্ক্রিন (ছোট sidebar/menu সহ), Landing নয়।
2. Logged-out user যদি landing দেখতে চায় → একটা button "টালি প্লাস সম্পর্কে জানুন" / "Learn about Tally Plus" → `/about` route এ পুরো landing page দেখাবে।
3. Logged-in user যখন Home/Logo এ click করবে → role অনুযায়ী automatic dashboard এ যাবে (owner → `/app/dashboard`, customer → `/customer/dashboard`)।
4. Landing page এর content update — শুধু দোকানদার নয়, এখন **Personal/গ্রাহক** ও **দোকান** দুই ব্যবহার দেখাতে হবে। Auth role label-ও "personal/গ্রাহক" এবং "দোকান/দোকানদার" হিসেবে স্পষ্ট করতে হবে।

---

## পরিবর্তন বিস্তারিত

### 1) Route-level home behavior (`src/pages/Index.tsx`)

`Index.tsx` কে একটি "smart entry" বানাব:

- `useAuth()` থেকে user/role দেখব।
- **Logged-in হলে**: `useEffect` দিয়ে `Navigate` করব —
  - role = `owner` → `/app/dashboard`
  - role = `customer` → `/customer/dashboard`
  - role যদি load হতে দেরি করে → `RouteFallback` দেখাব।
- **Logged-out হলে**: পুরো landing page না দেখিয়ে নতুন `<AuthEntry />` component দেখাব (Facebook-style)।
- পুরোনো landing sections (HeroSection, FeatureRows, CompareTable ইত্যাদি) `Index.tsx` থেকে সরিয়ে নতুন `src/pages/About.tsx` route এ move করব। Route registration: `app-routes.tsx` এ `{ path: "about", element: <Lazy About /> }`।

### 2) New `AuthEntry` component (`src/components/site/AuthEntry.tsx`)

Facebook-এর first-screen এর মতো minimal layout —

```
+-----------------------------------------------+
| [Logo] Tally Plus              [BN/EN] [☾]    |  ← compact top bar
+--------------------+--------------------------+
| Brand pitch (left) | Login/Signup card (right)|
| - "টালি প্লাস:     | - Phone + PIN form       |
|   ব্যক্তিগত হিসাব  | - Tabs: লগইন | সাইন-আপ   |
|   ও দোকান একসাথে" | - Role toggle: গ্রাহক /   |
| - 2-3 bullet      |   দোকান                  |
|                   | - "টালি প্লাস সম্পর্কে    |
|                   |   বিস্তারিত জানুন →"      |
|                   |   (link to /about)        |
+-----------------------------------------------+
| Footer: Privacy · Terms · Pricing · Marketplace|
+-----------------------------------------------+
```

- বিদ্যমান `HeroAuthCard` form logic পুনরায় ব্যবহার করব (rewire করে এখানে বসাব), যাতে phone+PIN auth flow ঠিক থাকে।
- Mobile-এ stacked: উপরে brand, নিচে form।
- নিচে ছোট link-row (sidebar/menu equivalent): মার্কেটপ্লেস · মূল্য · গোপনীয়তা · শর্তাবলী · এক্সপার্টের সাথে কথা বলুন (WhatsApp)।
- প্রধান CTA button: **"টালি প্লাস সম্পর্কে জানুন"** → `/about`।

### 3) New `About` page (`src/pages/About.tsx`)

- সম্পূর্ণ পুরোনো landing — `SiteHeader`, `HeroSection`, `FeatureRows`, `PainAndSolutions`, `CompareTable`, `BusinessTypes`, `Testimonials`, `PricingSection`, `ContactSection`, `StatsStrip`, `FinalCta`, `SiteFooter` — এখানে move হবে।
- উপরে একটা "← লগইন/সাইন-আপ এ ফিরে যান" link থাকবে।

### 4) Landing copy update (Personal + দোকান dual-positioning)

নিম্ন components এ bilingual (bn/en) copy update:

- **HeroSection.tsx**: 
  - Tagline: "টালি প্লাস — আপনার **ব্যক্তিগত হিসাব** ও **দোকানের হিসাব**, এক অ্যাপেই" / "Tally Plus — Your **personal finances** and **shop accounting**, in one app"।
  - Sub: ব্যক্তিগত আয়-ব্যয়, দেনা-পাওনা, ফর্দ; এবং পূর্ণাঙ্গ দোকান POS — দুটোই।
  - দুটো CTA: "ব্যক্তিগত হিসাবে শুরু করুন" এবং "দোকানের জন্য শুরু করুন" — দুটোই `/auth?role=customer` / `/auth?role=owner`।
- **BusinessTypes.tsx** এর উপরে নতুন `<UseCases />` block: দুই কলাম —
  - **Personal / গ্রাহক**: আয়-ব্যয়, দেনা-পাওনা, মাসিক report, ফর্দ ও wishlist, সাবস্ক্রিপশনে দীর্ঘমেয়াদি history।
  - **দোকান / Owner**: POS, stock, customer due, SMS marketing, multi-shop, employee, reports।
- **CompareTable.tsx**: "ব্যক্তিগত" column যোগ — গ্রাহক features কোনগুলো free/premium।
- **PricingSection.tsx**: "ব্যক্তিগত প্ল্যান" আলাদা group দেখানো (consumer_history_1y/5y/10y এসব plan ইতিমধ্যে DB তে আছে)।

### 5) Auth role label update (`src/pages/Auth.tsx` + `HeroAuthCard`)

- বর্তমানে `Role = "owner" | "customer"` — UI label দ্বিভাষিক করব:
  - `customer` → "ব্যক্তিগত (গ্রাহক)" / "Personal (Customer)"
  - `owner` → "দোকান (দোকানদার)" / "Shop (Owner)"
- সংক্ষিপ্ত helper text: কোনটা বেছে নিলে কী পাবে।
- URL param `?role=customer|owner` সমর্থন → প্রি-সিলেক্ট।
- Login সফল হলে redirect:
  - owner → `/app/dashboard`
  - customer → `/customer/dashboard` (বর্তমানে সব `/app/dashboard` এ যায় — fix)।

### 6) `SiteHeader` (About page এর জন্য) ও global Logo behavior

- Logo/Home click সবখানে একই helper `goHome()` ব্যবহার করবে:
  - logged-out → `/` (AuthEntry)
  - owner → `/app/dashboard`
  - customer → `/customer/dashboard`
- Header-এর "Home" link এই helper দিয়ে রিপ্লেস।

### 7) Routes (`src/lib/app-routes.tsx`)

- `{ path: "about", element: <Lazy About /> }` যোগ।
- `index` রুট এখনও `Index.tsx` (smart entry) থাকবে।

### 8) i18n strings (`src/lib/i18n` dictionaries)

নতুন keys যোগ: `learnAboutTallyPlus`, `personalUse`, `shopUse`, `personalUseHint`, `shopUseHint`, `backToLogin` ইত্যাদি — bn ও en দুটোতেই।

---

## Out of scope (এই plan এ নয়)

- Database/SQL change লাগবে না।
- বিদ্যমান `HeroAuthCard` এর actual auth call flow অপরিবর্তিত — শুধু placement/label বদলাবে।
- `/about` পেজে existing landing components-এর styling এ বড় ভাঙচুর হবে না, শুধু copy update।

---

## ফাইল পরিবর্তন সারাংশ

- **Modified**: `src/pages/Index.tsx`, `src/pages/Auth.tsx`, `src/components/site/SiteHeader.tsx`, `src/components/site/HeroSection.tsx`, `src/components/site/CompareTable.tsx`, `src/components/site/BusinessTypes.tsx`, `src/components/site/PricingSection.tsx`, `src/components/site/HeroAuthCard.tsx`, `src/lib/app-routes.tsx`, `src/lib/i18n` dictionary file।
- **New**: `src/pages/About.tsx`, `src/components/site/AuthEntry.tsx`, `src/components/site/UseCases.tsx`, `src/lib/home-redirect.ts` (goHome helper)।

অনুমোদন দিলে এই অনুযায়ী implement করব।
