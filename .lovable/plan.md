## Goal

Make the landing/home stats real, drop the fake app rating, and make the desktop (PC) install affordance discoverable.

---

## 1) Dynamic landing stats (Hero + StatsStrip)

Currently both `HeroSection.tsx` and `StatsAndCta.tsx → StatsStrip` render hard‑coded values:
- `১০,০০,০০০+ ব্যবসায়ী` (fake)
- `৪.৪★ অ্যাপ রেটিং` (fake — and there is no app store listing yet)
- `২৪/৭ কাস্টমার সাপোর্ট`

**Real numbers available in DB:**
- `profiles` → owners/employees count
- `shops` → registered shops
- `consumer_profiles` → personal/customer users
- `auth.users` → total users

Counts on those tables aren't readable to anonymous visitors via RLS, so we add a tiny public edge function.

### New edge function: `supabase/functions/public-stats/index.ts`
- No auth required (verify_jwt = false in `supabase/config.toml`).
- Uses service‑role key server‑side to run:
  - `select count(*) from shops`
  - `select count(*) from profiles`
  - `select count(*) from consumer_profiles`
  - `select count(*) from auth.users` (via admin API)
- Returns `{ shops, owners, customers, totalUsers }`, cached `Cache-Control: public, max-age=300`.

### New hook: `src/lib/use-public-stats.ts`
- `useQuery(["public-stats"], …)` → calls the edge function with 5‑minute `staleTime`.
- Returns `{ shops, owners, customers, totalUsers, isLoading }`.

### Update `src/components/site/HeroSection.tsx`
Replace the two‑tile strip with three real tiles:
1. **মোট ব্যবহারকারী / Total users** → `totalUsers`
2. **নিবন্ধিত দোকান / Shops registered** → `shops`
3. **গ্রাহক / Customers** → `customers`

Numbers formatted with `bnNum` in BN. While loading, show a small skeleton (`—`).

### Update `src/components/site/StatsAndCta.tsx → StatsStrip`
Same three real items (replaces the current 3 hard‑coded ones). Drop `App Rating`. Keep the `24/7 Customer Support` line moved to a sub‑caption under the strip if desired, OR replace with **"নিবন্ধিত দোকান"**. Final 3 tiles:
1. মোট ব্যবহারকারী
2. নিবন্ধিত দোকান
3. গ্রাহক / সক্রিয় কাস্টমার

(If counts are still small, still show real numbers — no inflation.)

### i18n
Add keys in `src/lib/i18n.tsx`: `statTotalUsers`, `statShops`, `statCustomers` (BN/EN).

---

## 2) PC install button visible everywhere

Today `InstallAppButton` is only mounted in `AppTopbar` (logged‑in app). On the public landing/home there is nothing, and even inside the app the button silently hides when `canInstall=false` (Chrome desktop often delays `beforeinstallprompt` or never fires it inside the Lovable preview iframe — that's why you don't see it).

### Changes
**a. `src/hooks/use-pwa-install.ts`**
- Add `isDesktop` detection (no touch + wide viewport + not iOS).
- Keep `canInstall` flag unchanged.

**b. `src/components/app/InstallAppPrompt.tsx → InstallAppButton`**
- Remove the early‑return `if (!canInstall && !isIos) return null`.
- Always render the button when not `installed`.
- Click behavior:
  - If `canInstall` → call `promptInstall()` (native prompt).
  - Else if `isIos` → existing iOS dialog.
  - Else (desktop with no BIP yet) → open a new **"Install on desktop"** dialog with browser‑specific instructions:
    - Chrome / Edge: address bar → install icon (⊕) → Install.
    - Brave / Opera: same install icon.
    - Firefox: explain limited support, suggest Chrome/Edge, or "Add to Home Screen" via a PWA add‑on.
- Label remains "অ্যাপ ইনস্টল / Install app", `Download` icon.

**c. `src/components/site/SiteHeader.tsx`**
- Mount `<InstallAppButton />` next to the language/theme toggles so it shows on the public landing & marketing pages too. Hidden automatically once `installed=true`.

**d. `src/components/app/InstallAppPrompt.tsx → InstallAppPrompt` (auto popup)**
- Allow it to also surface on desktop after `SHOW_DELAY_MS` if not installed (today it's gated to `canInstall || isIos`). On desktop without BIP, clicking opens the new instructions dialog instead of the native prompt.

### Notes
- Inside the Lovable editor preview iframe `beforeinstallprompt` will not fire — install will only become a true one‑click on the published `tallyplus.lovable.app` site or any standalone tab. The instructions dialog covers that gap so users on PC always see *some* path to install.

---

## Files touched

Created:
- `supabase/functions/public-stats/index.ts`
- `src/lib/use-public-stats.ts`

Edited:
- `supabase/config.toml` (register `public-stats`, `verify_jwt = false`)
- `src/components/site/HeroSection.tsx`
- `src/components/site/StatsAndCta.tsx`
- `src/lib/i18n.tsx`
- `src/hooks/use-pwa-install.ts`
- `src/components/app/InstallAppPrompt.tsx`
- `src/components/site/SiteHeader.tsx`
