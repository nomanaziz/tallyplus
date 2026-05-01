## লক্ষ্য

আলাদা `/auth` পেজ পুরোপুরি সরিয়ে দিয়ে, `/auth` এর সরল login/signup design টা সরাসরি **হোম পেজ (`/`)** এ বসানো। বর্তমান হোম পেজে যে দুই-কলাম brand-pitch + HeroAuthCard layout আছে (AuthEntry component) সেটা সরে গিয়ে শুধু একটাই পরিষ্কার কার্ড দেখাবে — যেমনটা এখন `/auth` এ আছে।

## এখন যা আছে

- `/` → `Index.tsx` → `<AuthEntry />` (ব্রান্ড পিচ + tabs সহ HeroAuthCard, একটু গ্যাঞ্জাম)
- `/auth` → `Auth.tsx` (পরিষ্কার single card: Login tab → phone+PIN; Create account tab → name/shop/PIN; post-signup sample import prompt সহ)

## পরিবর্তন

### 1. হোম পেজ replace
`src/pages/Index.tsx` এর ভেতরের রেন্ডার `<AuthEntry />` এর জায়গায় `Auth.tsx` এর form UI বসবে (logged-out হলে)। logged-in হলে আগের মতই role অনুযায়ী dashboard এ redirect হবে।

বাস্তবায়নের জন্য `Auth.tsx` এর form অংশটাকে একটা reusable component এ refactor করব: `src/components/site/LoginCard.tsx` — যেটা SiteHeader/SiteFooter wrapper ছাড়া শুধু কেন্দ্রে কার্ড দেখাবে। এটাই Index এবং (যদি কোথাও ভুলে কেউ /auth এ আসে) redirect target এ ব্যবহার হবে।

কার্ডের ভেতরে যা থাকবে (Auth.tsx এর মতই):
- Login mode: role tabs (দোকানদার/গ্রাহক) → মোবাইল + PIN → লগইন → "Create account" link → "PIN ভুলে গেছেন? WhatsApp"
- Signup mode: role tabs → নাম (+ owner হলে দোকানের নাম, ShopTypePicker) → মোবাইল + PIN → Account তৈরি → "← লগইনে ফিরুন"
- Owner signup এর পর sample import prompt (আগের মতই)

হোম পেজে SiteHeader থাকবে কি না: হ্যাঁ, ভাষা switch ও logo-র জন্য SiteHeader রাখব (আগের `/auth` এর মতই)। SiteFooter ও থাকবে।

### 2. `/auth` route ও `Auth.tsx` মুছে দেওয়া
- `src/lib/app-routes.tsx` থেকে `path: "auth"` route এবং `L56` lazy import সরানো হবে।
- `src/pages/Auth.tsx` ফাইল delete হবে।

### 3. সব `/auth` references হোমে redirect
নিচের ফাইলগুলোতে `/auth` কে `/` দিয়ে replace করা হবে (অথবা প্রাসঙ্গিক query সহ যেমন `/?mode=signup`):

```
src/pages/customer/Profile.tsx          → "/auth" → "/"
src/pages/customer/CustomerLayout.tsx   → "/auth" → "/"
src/pages/Affiliate.tsx                 → Link to="/auth" → "/"
src/components/site/SiteHeader.tsx      → 2 জায়গায় "/auth" → "/"
src/components/site/SiteFooter.tsx      → "/auth" → "/"
src/components/site/PricingSection.tsx  → navigate /auth → "/"
src/components/site/HeroAuthCard.tsx    → "পুরো Login পেজে যান" link পুরো বাদ
src/pages/affiliate/Register.tsx        → "/auth" → "/"
src/pages/admin/Login.tsx               → "/auth" → "/"
src/components/app/NewUserAccessDialog.tsx → loginUrl `/auth?phone=` → `/?phone=`
```

হোম পেজে phone query param থাকলে (NewUserAccessDialog flow) সেটা phone field এ pre-fill হবে।

### 4. AuthEntry / HeroAuthCard cleanup
- `src/components/site/AuthEntry.tsx` আর কোথাও use হচ্ছে না — delete।
- `src/components/site/HeroAuthCard.tsx` ও আর use হবে না (AuthEntry এর ভেতরেই ছিল) — delete।
- `src/lib/home-redirect.ts` যা logged-in user এর জন্য target ঠিক করে — অপরিবর্তিত রাখা হবে।

## ফাইল সারাংশ

```text
নতুন:  src/components/site/LoginCard.tsx   (reusable login/signup card)
বদল:   src/pages/Index.tsx                  (AuthEntry → LoginCard + header/footer)
       src/lib/app-routes.tsx               (/auth route ও L56 সরানো)
       উপরের ১১টি ফাইল                       (/auth → /)
মুছে দেয়া: src/pages/Auth.tsx
           src/components/site/AuthEntry.tsx
           src/components/site/HeroAuthCard.tsx
```

## ফলাফল

- হোম পেজ এ ঢুকেই সরাসরি পরিষ্কার login card — অতিরিক্ত brand pitch / dual column ঝামেলা নেই।
- "Create account" tab এ গেলে শুধু দরকারি field গুলো (নাম, দোকান হলে দোকানের নাম+ধরন, ফোন, PIN)।
- আলাদা `/auth` পেজ আর নেই; পুরোনো লিংক বা bookmark গেলে home এ redirect (router এর `*` notfound হিসেবে নয় — আমরা সব আভ্যন্তরীণ link ঠিক করে দিচ্ছি, আর `/auth` URL এ গেলে NotFound এড়াতে চাইলে পরে `Navigate` redirect যোগ করা যাবে; এই plan এ সব internal link ই হোমে যায়, তাই সমস্যা নেই)।
- Logged-in user হোমে আসলে আগের মতই role-aware dashboard এ চলে যাবে।
