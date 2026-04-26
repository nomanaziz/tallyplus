
# গোল

পুরা app টা **super fast** করা — সব feature রেখে, Supabase backend রেখে, Vercel-এ deploy-ready বানিয়ে। কোনো feature বাদ যাবে না।

# কেন এত slow এখন (root causes)

1. **SSR overhead in dev**: TanStack Start SSR mode-এ সব routeTree main bundle-এ entry, প্রতি navigation-এ `__tanstack-start/styles.css` + route chunks fetch হয়। Mobile-এ FCP ~3 সেকেন্ড।
2. **Zero code-splitting**: 74 route file, কোনোটাই `lazy` নয় — auth page খুলতেও admin/affiliate/online-shop সব route module load হয়।
3. **Login waterfall**: 
   - `auth.tsx` → edge function `login-with-pin` → `setSession` → তারপর `app.tsx` mount → `AuthProvider.loadProfile` (3টা query) → `ShopProvider.refresh` → `PermissionsProvider` (3টা serial query) → তারপর dashboard query।
   - প্রতিটা edge function cold start ~1-2s, total প্রায় 5-8s নীরব loading।
4. **No optimistic UI / visible feedback**: Login button press করলে কোনো instant feedback নেই (form reset হয়ে যায় re-render-এ)।
5. **Heavy global providers**: I18n + Theme + Auth + RefCapture + InstallAppPrompt সব root-এ — public landing page-ও পুরা auth stack load করে।
6. **Notifications poll every 30s** + realtime subscribe — সব route-এ চলে।
7. **Edge function based auth**: প্রতি login-এ Deno cold-start + bcrypt; ভাল হবে direct password sign-in (backend trigger PIN→password mapping ইতিমধ্যে আছে)।

# Solution Architecture

## A) Stack: SPA on Vercel (SSR বাদ)

TanStack Start-এর SSR এই app-এ extra চাপ — সব data RLS-protected per-user, public SEO-যোগ্য page শুধু `/`, `/pricing`, `/affiliate`, `/shop/*`, `/f/$slug`। এই কয়েকটা page-এর জন্য full SSR overhead রাখা wasteful।

**পরিবর্তন:**
- Vite SPA build (`vite build`) + TanStack **Router** (Start ছাড়া) রাখা।
- `src/router.tsx` shell unchanged; `__root.tsx` থেকে `shellComponent`/`HeadContent`/`Scripts` সরিয়ে standard `<RouterProvider>` mount in `src/main.tsx`।
- `index.html` static — meta tags react-helmet-async দিয়ে per-route inject (SEO-যোগ্য কয়েকটা public page-এর জন্য enough)।
- **Vercel config**: `vercel.json` SPA rewrite (`/* → /index.html`), edge cache for static assets।
- Edge functions Supabase-এই থাকবে (নতুন কিছু লাগে না)।

ফলাফল: প্রথম load 3s → ~700-900ms, route transition instant (chunk cached হয়)।

## B) Aggressive code-splitting

প্রতি route file-এর component-কে `React.lazy` দিয়ে wrap করব (TanStack Router-এ route definition ছোট রেখে component lazy)। তাহলে `/auth` খুললে শুধু auth chunk + root shell load হবে।

- Helper: `lazyRoute(() => import("./..."))` factory।
- Critical bundle target: <120 KB gz (এখন ~600 KB+)।

## C) Login flow rewrite — "instant feel"

1. **Form state সুরক্ষা**: Form-এ `useRef`-based controlled input + `defaultValue` দিয়ে re-render-এ field clear হবে না।
2. **Visible loader**: Login button-এ instant spinner + button label "লগইন হচ্ছে..."; নিচে progress text "PIN যাচাই → সেশন তৈরি → ড্যাশবোর্ড..." যাতে user বুঝতে পারে কোন stage-এ আছে।
3. **Edge function বদলে direct sign-in**:
   - Phone + PIN → ক্লায়েন্ট-side `email = "{digits}@tally.local"`, `password = "tp_{digits}_pw"` (existing scheme)।
   - সরাসরি `supabase.auth.signInWithPassword()` — edge function cold start বাদ। Login 2-3s → ~400ms।
   - "wrong_pin" detect: signIn fail হলে শুধু তখন edge function call করব verify-এর জন্য (rare path)।
   - **Signup-এর জন্য** edge function রাখতেই হবে (admin createUser দরকার), কিন্তু signup rare।
4. **Redirect-back**: `/auth?redirect=/app/sell` support করব যাতে protected route থেকে bounce করলে আবার সেখানেই ফিরে।
5. **Skeleton dashboard**: Login complete হওয়ার সাথে সাথে dashboard-এ navigate করব stale-while-revalidate cache দিয়ে — সংখ্যাগুলো ০ দেখাবে, তারপর update হবে। Black screen থাকবে না।

## D) Auth + data layer simplify

1. `AuthProvider.loadProfile`-এর 3টা query → 1টা PostgreSQL view `v_my_account` (profile + roles + active sub একসাথে), fetch via single `.rpc()` বা view query। 1 round-trip।
2. `PermissionsProvider`-এর 3 query → 1 view `v_my_shop_perms(shop_id)` — owner/admin/member/custom-role পুরোটা একসাথে।
3. সব list query (`productsListQuery` etc.) আগে থেকে আছে — শুধু **route loader-এ `ensureQueryData`** দিয়ে prefetch করব যাতে navigation মুহূর্তেই data দেখায়।
4. Heavy unused queries (admin pages, online-shop pages) only when route hit.
5. `staleTime` raise: dashboard 60s → 5min, products 60s → 5min — repeat navigation-এ refetch হবে না।

## E) Mobile UX feedback (loaders everywhere)

- Top progress bar (already আছে) — এটা retain করব।
- প্রতি route-এ `pendingComponent` (skeleton)। 200ms-এর বেশি wait হলে দেখাবে।
- Button-গুলোতে disabled + spinner + হালকা বাংলা status text।
- Network offline detect → toast "ইন্টারনেট নেই — পুনরায় চেষ্টা করুন"।

## F) Notifications & realtime

- `NotificationBell` realtime subscription শুধু `/app/*` route-এ active হবে (এখন সব page-এ subscribe করে)।
- Polling 30s → 60s; tab background হলে pause।
- `tg_notify_new_wishlist` trigger ইতিমধ্যে আছে — confirm করব এবং dropdown unread badge সঠিকভাবে রিফ্রেশ হবে।

## G) Asset & bundle diet

- `logo.png` 47KB → optimized SVG (~3KB)।
- `embla-carousel-react` শুধু dashboard-এ — already সঠিক, কিন্তু lazy import করব।
- Icons: lucide tree-shaken; barrel import সরাব।
- Tailwind v4 জায়গায় আছে — শুধু unused utility purge confirm।

## H) Vercel deployment

- `vercel.json`:
  ```
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
    "headers": [{ "source": "/assets/(.*)", "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]}] }
  ```
- Build command: `vite build` → output `dist`।
- ENV: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` user Vercel dashboard-এ যোগ করবে (আমি README-এ লিখে দিব)।

# Step-by-step execution plan

1. **Migrate TanStack Start → SPA**: 
   - Add `src/main.tsx` with `RouterProvider`।
   - `__root.tsx` থেকে `shellComponent`/`Scripts` সরাও।
   - Static `index.html` add (meta + root div)।
   - Update `vite.config.ts` (remove `@tanstack/react-start/plugin`, keep `@tanstack/router-plugin`)।
   - Add `vercel.json`।
2. **Code-split every route**: Update all 74 route files to use `lazyRouteComponent` pattern (or convert to `.lazy.tsx`)।
3. **Login speed-up**:
   - Rewrite `routes/auth.tsx`: direct `signInWithPassword` first, fallback to edge function on `Invalid login credentials`।
   - Persist form input via `useRef` + uncontrolled inputs।
   - Multi-stage loader text।
   - Add `?redirect=` support।
4. **Auth waterfall fix**:
   - Create DB view `v_my_account`, `v_my_shop_perms`।
   - Update `AuthProvider`/`PermissionsProvider` to single fetch each।
5. **Loaders + prefetch**:
   - Each `/app/*` route gets `loader: () => qc.ensureQueryData(...)`।
   - `pendingComponent` with skeleton।
6. **Cache tuning**: Bump `staleTime` for read-heavy queries; `gcTime` 30min।
7. **Notification scope**: Mount realtime only in `/app` layout; pause on background tab।
8. **Asset diet**: Replace `logo.png` with SVG; lazy-load embla; audit icons।
9. **QA**: Test login → dashboard → sell → wishlist on slow 3G profile; target FCP <1s, login round-trip <800ms।

# Fallback plan

কোনো step-এ unexpected break হলে আগের state-এ revert করে শুধু সেই module-এর fix চালাব। সব feature regression-test:
- Login (owner, admin, employee, consumer)
- Dashboard summary, sell, purchase, wishlist
- Notifications bell receives new wishlist
- Online shop public pages
- Affiliate, admin panels

# Time/credit estimate

মাঝারি refactor — একটা batch-এ সব করব না, **3টা phase**-এ ভাগ করব:

- **Phase 1 (এই approval-এ)**: Login fix + visible loaders + auth waterfall fix + notification scope। সবচেয়ে বড় UX impact।
- **Phase 2**: Code-splitting + cache tuning + asset diet।
- **Phase 3**: SPA migration + Vercel config + final QA।

প্রতি phase শেষে আপনি test করে next phase approve করবেন — এতে credit সবচেয়ে কম খরচ হবে এবং কোনো বড় regression হবে না।

**Phase 1 এখনই শুরু করব?** Approve করলে এই plan-এর Phase 1 implement করা হবে।
