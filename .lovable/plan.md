## কী হচ্ছে আসলে (Root Cause)

আপনার app টা একসাথে **দুইটা router** চালাচ্ছে — এটাই সব error-এর মূল কারণ।

1. **TanStack Start router** (Lovable-এর জন্য বাধ্যতামূলক) — `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/$.tsx`
2. **react-router-dom-এর BrowserRouter** — `src/App.tsx` ভিতরে, যেটা আবার পুরো `src/routes.tsx`-এ ১০০+ route চালাচ্ছে

এখন যা ঘটে:
- `src/routes/index.tsx` এবং `src/routes/$.tsx` দুজনেই `App.tsx` কে lazy-load করে
- `App.tsx` মাউন্ট করে `<BrowserRouter>` — TanStack-এর ভিতরে আরেকটা router
- দুই router একই URL দখলের চেষ্টা করে → SSR crash → **502 / "Internal Server Error"**
- "Vercel 404 NOT_FOUND" আসলে Vercel না — এটা Lovable-এর Cloudflare worker fallback page যখন SSR fail করে

আগের সব ফিক্স (BrowserRouter mount delay, hydration guard, package downgrade) এই core conflict-টা ছোঁয়নি — তাই বারবার ফিরে আসছে।

আর `vite.config.ts`-এ `manualChunks` `react-router-dom`-কে আলাদা vendor chunk করছে, যেটা `react-router-dom` সরালে ভেঙে যায় — তাই এটাও পরিষ্কার করতে হবে।

## সমাধান (One-Time Architecture Fix)

পুরো codebase কে **শুধুমাত্র TanStack Start file-based routing**-এ migrate করব। `react-router-dom` সম্পূর্ণ remove। এতেই Internal Server Error, 404, build fail — সব এক ফিক্সে যাবে।

### Step 1 — Router shim কে TanStack-এ rewire
`src/lib/router.tsx` এখন react-router-dom-এর উপর basis. এটাকে TanStack-এর `Link`, `useNavigate`, `useParams`, `useSearch`, `useLocation`, `Outlet`-এর উপর rewrite করব — same export names রাখব, যাতে app-জুড়ে ১০০+ call site অপরিবর্তিত থাকে। এতে TanStack-এর type-safe routing পাবেন কিন্তু component code বদলাতে হবে না।

### Step 2 — App.tsx + routes.tsx সরানো
`src/App.tsx` এবং `src/routes.tsx` delete। সব route TanStack-এর file-based system-এ যাবে।

### Step 3 — সব page-কে TanStack route file বানানো
`src/routes.tsx`-এ থাকা প্রতিটা path-এর জন্য `src/routes/`-এ মিল রেখে file তৈরি করব (flat dot-separated naming):

```text
src/routes/
  index.tsx                      -> /  (landing)
  auth.tsx                       -> /auth
  pricing.tsx, privacy.tsx, terms.tsx
  admin.tsx                      -> /admin (layout)
  admin.index.tsx, admin.users.tsx, admin.plans.tsx, ... (২২টা)
  app.tsx                        -> /app  (layout = AppLayout)
  app.dashboard.tsx, app.sell.tsx, app.products.tsx, ... (৪০+টা)
  app.online-shop.tsx            -> /app/online-shop (nested layout)
  app.online-shop.products.tsx, ... (১৪টা)
  app.returns.$id.tsx, app.returns.new.tsx
  affiliate.tsx, affiliate.register.tsx
  customer.tsx, customer.dashboard.tsx, ...
  shop.tsx, shop.p.$id.tsx, shop.s.$slug.tsx
  vendor.$username.tsx
  f.$slug.tsx, f.$slug.my.tsx
```

প্রতিটা file খুবই ছোট হবে — শুধু `createFileRoute(...)` + existing page component import। page গুলো নিজেরাই (Sell.tsx, Dashboard.tsx ইত্যাদি) অপরিবর্তিত থাকবে।

### Step 4 — Splat route ও legacy fallback সরানো
`src/routes/$.tsx` (যেটা App.tsx লোড করে) delete। বদলে `__root.tsx`-এ proper `notFoundComponent` থাকবে — Lovable-এর hosting auto-handle করবে deep-link 404।

### Step 5 — package.json + vite.config পরিষ্কার
- `react-router-dom` dependency সরাব
- `vite.config.ts`-এর `manualChunks` থেকে `"react-router-dom"` সরাব
- `bun.lockb` regenerate

### Step 6 — Error/NotFound boundaries
TanStack-এর rule অনুযায়ী `__root.tsx`-এ `notFoundComponent`, `router.tsx`-এ `defaultErrorComponent` যোগ করব — যেগুলো এখন missing।

## কেন এবার আর fail হবে না

| সমস্যা | পুরানো কারণ | এই ফিক্সের পরে |
|---|---|---|
| Internal Server Error (502) | দুই router conflict, SSR crash | একটাই router (TanStack) |
| Vercel 404 NOT_FOUND | Worker fallback page | Lovable hosting native TanStack handle করে |
| বারবার build fail | mixed types, lock file conflict | শুধু TanStack types, react-router-dom নেই |
| `zod` peer conflict (আগের error) | npm install Vercel-এ; এখন bun ব্যবহার | bun.lockb regenerate, npm install আর লাগবে না |
| Refresh-এ blank page | BrowserRouter SSR-এ window নেই | TanStack file-based SSR-safe |

## Scope ও Risk

- **প্রায় ৯০টা route file** তৈরি হবে — কিন্তু প্রতিটাই ৫-৮ লাইনের boilerplate
- কোনো page-এর internal logic, UI, Supabase call **পরিবর্তন হবে না**
- `@/lib/router` থেকে যারা import করছে (sidebar, header, প্রতিটা page) — সব unchanged, কারণ shim same API দেবে
- বড় migration, কিন্তু এটাই এই বারবার-fail হওয়ার একমাত্র permanent ফিক্স। Patch দিয়ে আর কাজ হবে না — আগে ৩-৪ বার চেষ্টা হয়েছে।

## অনুমোদন চাই

এটা বড় কাজ (~২ ঘণ্টার AI work) কিন্তু এর পরে আপনার deployment স্থির হবে। **Approve করলে** আমি step-by-step এগোব এবং প্রতিটা stage-এর পর build verify করে যাব।
