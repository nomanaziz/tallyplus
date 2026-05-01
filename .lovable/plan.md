সমস্যার মূল কারণ: এই প্রজেক্টটি বর্তমানে Vite + react-router-dom SPA হিসেবে চলছে (`BrowserRouter` ব্যবহার করছে), তাই `/app/dashboard`, `/customer/dashboard`, `/admin/...` এর মতো deep route-এ browser refresh দিলে Vercel server ওই path-টা real file/page হিসেবে খুঁজে পায়। না পেলে `404 NOT_FOUND` দেয়। একই কারণে PWA install করার পরে app launch হলে `manifest.webmanifest`-এর `start_url: /app/dashboard` সরাসরি hit হয়ে 404 আসে.

আমি এই ফিক্সের জন্য নিচের কাজগুলো করব:

1. Vercel SPA fallback routing যোগ করব
- root-এ `vercel.json` যোগ করব
- এমন rewrite rule দেব যাতে asset/file request বাদে সব app route `/index.html`-এ serve হয়
- এতে refresh, direct open, bookmarked URL, এবং installed PWA launch — সবক্ষেত্রে React router route resolve করতে পারবে

2. PWA launch path নিরাপদ করব
- `public/manifest.webmanifest` review/update করব
- installed app open হওয়ার সময় যেন route fallback-এর সাথে conflict না করে সেটা নিশ্চিত করব
- দরকার হলে `start_url`-কে `/` বা safer app entry path-এ adjust করব, যাতে login/non-login দুই অবস্থাতেই clean boot হয়

3. Login refresh flow verify করব
- `/app/dashboard` hard refresh
- `/app/products` hard refresh
- `/customer/dashboard` hard refresh
- `/admin` hard refresh
- logged-in state reload-এর পরে Supabase session restore ঠিকমতো কাজ করছে কি না confirm করব

4. Install App flow verify করব
- install button click/launch path inspect করব
- installed app open করার সময় 404 আর হচ্ছে না — এটা check করব
- manifest/icon path ঠিক আছে কি না confirm করব

5. Final cleanup
- rewrite যেন static assets (`/assets/*`, icons, manifest, favicon) ভাঙে না সেটা নিশ্চিত করব
- প্রয়োজন হলে hosting note যোগ করব যাতে Vercel-এ future deploy-এ একই সমস্যা আর না হয়

Technical details
- Observed files:
  - `src/main.tsx` → `BrowserRouter` ব্যবহার করছে
  - `src/lib/app-routes.tsx` → client-side route tree আছে (`/app/dashboard` সহ)
  - `public/manifest.webmanifest` → `start_url` currently `/app/dashboard`
  - repo-তে এখনো `vercel.json` নেই
- Root cause:
  - normal in-app navigation works because React handles it client-side
  - refresh/direct-open/install-launch fails because Vercel server deep links resolve করতে পারছে না
- Planned host fix:
```text
Browser hits /app/dashboard
-> Vercel rewrite to /
-> index.html loads
-> React app boots
-> router matches /app/dashboard
-> auth restores session
-> page renders
```

Approve করলে আমি এই plan অনুযায়ী implementation করে Vercel refresh + install 404 problem fix করে দেব.