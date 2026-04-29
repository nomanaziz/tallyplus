আমি যা পেয়েছি

- `https://tallyplus.lovable.app/` root page খুলছে, কিন্তু direct URL যেমন `/admin/login`, `/pricing`, `/app/due-ledger` — সবগুলোতেই `Not Found` আসছে.
- কোডে এই route-গুলো আছে: `src/routes.tsx`-এ `/admin/login` সহ admin/app route define করা আছে.
- app এখন `src/main.tsx`-এ `BrowserRouter` দিয়ে চলছে.
- repo-তে `vercel.json` rewrite আছে, কিন্তু Lovable hosting এই setup-এ সেটা ধরে deep-link fallback দিচ্ছে না.
- preview URL-এ `/admin/login` গেলে `Authenticating...` দেখা যাচ্ছে, মানে preview link access-protected; এটা route-missing error না, preview auth layer.

Plan

1. Routing layer-টা Lovable-supported structure-এ নিয়ে যাওয়া
- current `BrowserRouter`-based SPA routing থেকে supported file-based/TanStack Start routing-এ migrate করব
- existing page components (`src/pages/...`) যতটা সম্ভব reuse করব, যাতে UI/logic আবার নতুন করে লিখতে না হয়

2. Existing URL map preserve করা
- `/admin/login`
- `/admin/*`
- `/app/*`
- `/auth`, `/pricing`, `/privacy`, `/terms`
- marketplace / customer / affiliate / vendor / shop routes
সব পুরনো URL একই রাখব, যাতে link break না হয়

3. Admin flow ঠিকভাবে wire করা
- `Admin.tsx` layout + `src/pages/admin/Login.tsx` route binding ঠিক রাখব
- direct-load, refresh, bookmark, published domain — সব ক্ষেত্রেই `/admin/login` কাজ করছে কি না verify করব
- admin না হলে redirect behavior আগের মতোই থাকবে

4. Publish-path verification
- published domain-এ অন্তত এই path গুলো direct খুলে test করব:
  - `/admin/login`
  - `/pricing`
  - `/app/due-ledger`
- preview/auth behavior আর published behavior আলাদা করে confirm করব

5. Git issue আলাদা করে clear করা
- Git disconnect/push issue app code-এর route bug না
- এটা Lovable connector-level problem
- implementation শেষে আমি আপনাকে exact checklist দেব:
  - Connectors → GitHub status check
  - GitHub App authorization revoke/reconnect
  - repo permission mismatch আছে কি না
  - project linked repo stale হলে reconnect path

Technical details

```text
Current state
Published domain request to /admin/login
-> hosting looks for physical route
-> no server-side route fallback
-> returns Not Found

After fix
Published domain request to /admin/login
-> TanStack/Lovable route resolves path
-> app renders AdminLoginPage
-> supabase auth check runs normally
```

নোট

- Git disconnect button app-এর ভিতরে code change করে আনা যাবে না; এটা Lovable platform setting.
- কিন্তু `/admin/login` not found issue codebase-level routing fix দিয়েই সমাধান করা যাবে.
- এই plan approve করলে আমি routing migration + admin route fix implement করব, তারপর কোন URL কাজ করছে সেটা final check দিয়ে জানাব.