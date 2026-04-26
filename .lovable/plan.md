
# TanStack Start থেকে Pure Vite + React SPA-তে Migration

## কেন এই migration

আপনার current stack `TanStack Start` (SSR-capable framework, Cloudflare Worker runtime দিয়ে rebuild হয়)। এটাই slow load, Vercel deploy fail, এবং এত route (75+) থাকায় rebuild error-এর মূল কারণ। আপনার আগের সব Lovable apps যেগুলো fast সেগুলো ছিল pure Vite SPA।

ভালো খবর: কোডবেসে কোনো `createServerFn` ব্যবহার নেই, কোনো server-side feature নেই — সব data fetching client-side Supabase দিয়ে। শুধু routing layer পাল্টালেই হবে।

## কী কী রাখা হবে (১০০% অপরিবর্তিত)

- পুরো Supabase database, schema, RLS policies, edge functions, storage buckets
- সব 75টা route file-এর **content/JSX/business logic**
- সব components (`src/components/`), hooks, lib utilities, i18n, theme, auth provider
- Tailwind v4 styles (`src/styles.css`), design tokens, brand colors
- TanStack Query (data fetching), Radix UI, shadcn components, sonner toasts
- সব assets, public files, manifest, icons
- Bengali content, copy, branding

## কী পাল্টাবে (শুধু stack layer)

| পুরোনো | নতুন |
|---|---|
| `@tanstack/react-start` | সরিয়ে দেওয়া |
| `@tanstack/react-router` (file-based) | `react-router-dom` v6 (declarative) |
| `@tanstack/router-plugin`, Cloudflare plugin | সরিয়ে দেওয়া |
| `@lovable.dev/vite-tanstack-config` | standard `vite + @vitejs/plugin-react` |
| `src/routes/__root.tsx` (shellComponent) | `src/main.tsx` + `src/App.tsx` |
| `src/routeTree.gen.ts` (auto-generated) | `src/routes.tsx` (manual route table) |
| File-based routes (`app.dashboard.tsx`) | Component-based pages (`src/pages/app/Dashboard.tsx`) |
| `<Link to="/x" />` from tanstack | `<Link to="/x" />` from react-router-dom |
| `Route.useParams()` | `useParams()` hook |
| `Route.useSearch()` | `useSearchParams()` hook |
| SSR/hydration | পুরোপুরি client-rendered SPA |

## নতুন structure

```text
src/
  main.tsx                    # ReactDOM.createRoot, providers wrap
  App.tsx                     # <BrowserRouter> + <Routes>
  routes.tsx                  # সব route definitions, lazy-loaded
  pages/
    Index.tsx                 # ছিল routes/index.tsx
    Auth.tsx                  # ছিল routes/auth.tsx
    Pricing.tsx
    NotFound.tsx
    app/
      Dashboard.tsx           # ছিল routes/app.dashboard.tsx
      Sell.tsx
      Products.tsx
      ... (সব app.* routes)
      AppLayout.tsx           # ছিল routes/app.tsx (Outlet wrapper)
      OnlineShop/
        Index.tsx, Orders.tsx, Products.tsx ...
    admin/
      AdminLayout.tsx, Index.tsx, Users.tsx ...
    fordo/
      Slug.tsx                # ছিল f.$slug.tsx → /f/:slug
      SlugMy.tsx              # /f/:slug/my
    shop/
      Index.tsx, Product.tsx (/shop/p/:id), Slug.tsx (/shop/s/:slug)
    affiliate/
      Index.tsx, Register.tsx
    vendor/
      Username.tsx            # /vendor/:username
  components/                 # অপরিবর্তিত
  hooks/                      # অপরিবর্তিত
  lib/                        # অপরিবর্তিত
  integrations/supabase/      # অপরিবর্তিত (auth-middleware.ts ডিলিট)
  styles.css                  # অপরিবর্তিত
index.html                    # নতুন — Vite SPA entry
```

## Route mapping (সব 75টা)

ফাইলগুলো একইভাবে move হবে, dot-notation → nested folder:

- `index.tsx` → `/` → `pages/Index.tsx`
- `auth.tsx` → `/auth`
- `pricing.tsx` → `/pricing`
- `app.tsx` → layout for `/app/*` (renders `<Outlet/>`)
- `app.dashboard.tsx` → `/app/dashboard`
- `app.sell.tsx` → `/app/sell`
- ... (সব 40+ `app.*` routes একইভাবে)
- `app.online-shop.tsx` → nested layout for `/app/online-shop/*`
- `app.online-shop.orders.tsx` → `/app/online-shop/orders`
- ... (12টা online-shop sub-routes)
- `app.returns.$id.tsx` → `/app/returns/:id`
- `admin.tsx` → layout for `/admin/*`
- `admin.users.tsx` → `/admin/users` ... (সব admin routes)
- `f.$slug.tsx` → `/f/:slug`
- `f.$slug.my.tsx` → `/f/:slug/my`
- `shop.p.$id.tsx` → `/shop/p/:id`
- `shop.s.$slug.tsx` → `/shop/s/:slug`
- `vendor.$username.tsx` → `/vendor/:username`
- `affiliate.tsx`, `affiliate.register.tsx`
- 404 → `pages/NotFound.tsx`

## Performance optimizations নতুন SPA-তে

1. **React.lazy + Suspense**: প্রত্যেক route lazy-loaded → initial bundle ছোট
2. **Manual chunk splitting**: vite.config-এ vendor chunks (react, radix, recharts, supabase) আলাদা
3. **Index page eager load**: শুধু landing page eager, বাকি সব lazy
4. **Preload on hover**: `<Link onMouseEnter>` দিয়ে route prefetch
5. **No SSR overhead**: সরাসরি static `index.html` serve হবে
6. **Vercel-friendly**: pure static SPA, যেকোনো host-এ deploy হবে (Vercel/Netlify/Cloudflare Pages/Lovable)

## Migration steps

1. **Dependencies**: `react-router-dom` add করা, TanStack Start/Router/Cloudflare plugin remove করা
2. **vite.config.ts**: standard `@vitejs/plugin-react` + `@tailwindcss/vite` + `vite-tsconfig-paths` + manual chunks
3. **index.html**: meta tags, fonts, manifest সহ root entry
4. **src/main.tsx**: ReactDOM root, providers
5. **src/App.tsx**: `BrowserRouter` + lazy `Routes`
6. **পুরোনো routes → new pages**: প্রত্যেক file move + এই পরিবর্তন:
   - `createFileRoute(...)` wrapper সরানো → plain default-exported component
   - `import { Link } from "@tanstack/react-router"` → `react-router-dom`
   - `Route.useParams()` → `useParams()`
   - `Route.useSearch()` → `useSearchParams()`
   - `Route.useNavigate()` → `useNavigate()`
   - `<Link to="/app/sell" params={{...}}>` → `<Link to="/app/sell">`
   - 3 file-এর loader logic → component-এ `useEffect` বা `useQuery`-তে move
7. **Delete**: `src/routes/`, `src/router.tsx`, `src/routeTree.gen.ts`, `wrangler.jsonc`, `.wrangler`, `auth-middleware.ts`, `tailwind.config.lov.json`
8. **Test**: dev server, build, route navigation
9. **package.json rename**: `tanstack_start_ts` → `tally-plus-spa`

## Outcome

- Vercel-এ এক ক্লিকে deploy হবে (static SPA)
- Initial load ~2-3x faster (no SSR hydration, smaller initial JS)
- Navigation instant (lazy chunks pre-cached)
- Rebuild error গায়েব (no Cloudflare Worker bundling)
- Database, content, design, business logic — সব hubahu

## Estimated scope

- ~75 route files migrate (mechanical, repetitive change)
- ~10 dependency updates
- ~5 config files (vite, tsconfig, index.html, main.tsx, App.tsx)
- শুধু routing layer পাল্টাচ্ছে, কোনো feature redesign নেই
- Approve করলে আমি step-by-step execute করব, বড় কাজ হলেও safe migration

আপনি Approve করলে আমি default mode-এ গিয়ে এই পুরো migration শুরু করব।
