সমস্যার মূল কারণগুলো
- `/auth` page নিজেই ধীরে খুলছে: browser profile-এ FCP প্রায় 3.2s, full load প্রায় 5.7s।
- Login submit-এর সময় request ~2s নিচ্ছে, কিন্তু UI-তে proper progress state নেই, তাই freeze মনে হচ্ছে।
- Console-এ TanStack Router preload error আছে: `_nonReactive` — এটা click/preload flow-কে unstable করছে।
- `AuthProvider` আর `ShopProvider` root level-এ থাকায় public page-এও session/profile/roles/subscription/shop query চলছে, যা auth page-কে অযথা heavy করছে।

Implementation plan

1. Auth page instantly visible করা
- `ShopProvider`-কে root থেকে সরিয়ে শুধু `/app` layout-এর মধ্যে রাখব, যাতে login page খুলতেই shops fetch না হয়।
- `AuthProvider`-কে split/lightweight করব: প্রথমে শুধু session resolve করবে, profile/roles/subscription fetch পরে বা app-entry-তে হবে।
- `/auth` route-এ first render block করে এমন dependency কমাব, যাতে click করলে form সাথে সাথে দেখা যায়।

2. Login UX-কে non-freezing করা
- Login button click করলে স্পষ্ট loading state দেখাব: button text, spinner/progress indicator, inputs disabled, “লগইন হচ্ছে...” message।
- যদি request কিছুটা সময় নেয়, small status text দেখাব যাতে user বুঝে কাজ চলছে।
- Success হলে immediate navigation; background refresh আলাদা থাকবে।
- Error handling clear করব: no account / wrong PIN / network সমস্যা আলাদা message।

3. Slow/unstable routing ঠিক করা
- Router-এর eager intent preloading সাময়িকভাবে কমাব বা disable করব, বিশেষ করে auth/public navigation-এ।
- `_nonReactive` preload error-এর source route/link ঠিক করব।
- `search={{}}`/typed route navigation যেখানে unnecessary, সেগুলো clean up করব যাতে click-এর সাথে extra route work না হয়।

4. Login request path optimize করা
- `login-with-pin` flow review করে unnecessary extra work কমাব।
- Session set হওয়ার পর `refresh()` + `refreshShops()` যেন UI block না করে, সেটা নিশ্চিত করব।
- Auth success-এর পর app-entry data loading staged করব: আগে shell, পরে secondary data।

5. App entry performance tuning
- `/app` layout-এ full-screen blocking loader কমিয়ে shell-first render approach নেব।
- Dashboard/app pages-এ query freshness/cache settings review করব যাতে login-এর পর প্রথম page unnecessarily heavy না হয়।
- যেখানে possible, critical vs non-critical data আলাদা করব।

6. Validation
- Login page open time, click response, submit feedback, redirect timing আবার check করব।
- Console/network error clean আছে কিনা verify করব।

Technical details
- Likely files:
  - `src/lib/auth.tsx`
  - `src/lib/shop.tsx`
  - `src/routes/auth.tsx`
  - `src/routes/app.tsx`
  - `src/routes/__root.tsx`
  - `src/router.tsx`
  - possibly `supabase/functions/login-with-pin/index.ts`
- Main refactor idea:
```text
Root
 └─ I18nProvider
    └─ AuthProvider (session-first, lightweight)
       ├─ public routes (/ , /auth, /pricing)
       └─ /app
          └─ ShopProvider
             └─ app pages
```
- Goal:
  - auth page click করলে immediate render
  - login submit করলে instant visual feedback
  - successful login-এর পর perceived freeze remove
  - preload error remove

Approve করলে আমি এই performance-focused auth refactor আর UX fixes implement করব.