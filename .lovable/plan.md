# Plan: Online Shop ফ্রিজ সমস্যা ঠিক করা + Install App বাটন

## সমস্যা ১ — Online shop পেজগুলো freeze হয়ে যায় (root cause)

`/app/online-shop` route এ child route আছে (যেমন `/messages`, `/settings`, `/orders`, `/themes`, `/customize`, `/products`, `/promo-codes`, `/fraud-check`) — কিন্তু parent component (`app.online-shop.tsx`) শুধু dashboard render করে, কোনো `<Outlet />` নেই। ফলে child route activate হলেও parent dashboard-ই দেখা যায় → মনে হয় ক্লিকে কিছু হলো না / freeze।

দ্বিতীয় সমস্যা: কিছু tile এমন route এ link করে যেগুলো এখনো বানানোই হয়নি (`/delivery`, `/featured`, `/marketing`, `/policy`) — এগুলো 404 বা freeze দেয়।

### Fix
1. **`src/routes/app.online-shop.tsx` কে split করব**:
   - নতুন **index route** `src/routes/app.online-shop.index.tsx` বানাব → এতে dashboard UI (tiles, stats, banner) যাবে।
   - বর্তমান `app.online-shop.tsx` কে layout বানাব: শুধু `<Outlet />` render করবে। ফলে `/messages`, `/orders` etc. ঠিকমতো render হবে।
2. **Dead tile গুলোর জন্য placeholder route বানাব** (যাতে freeze না হয়):
   - `app.online-shop.delivery.tsx`
   - `app.online-shop.featured.tsx`
   - `app.online-shop.marketing.tsx`
   - `app.online-shop.policy.tsx`
   - প্রত্যেকটায় simple "Coming soon" UI + back link, যাতে minimum কাজ করে।
3. Tile array থেকে "Change Username" tile-ও `/app/online-shop/settings` এ ঠিকঠাক যাবে (ইতিমধ্যেই আছে, verify করব)।

## সমস্যা ২ — PWA Install button

বর্তমান অবস্থা: `manifest.webmanifest` already আছে, `usePwaInstall` hook-ও আছে (`src/hooks/use-pwa-install.ts`) — কিন্তু কোথাও use হয়নি, তাই user কে browser menu থেকে manual install করতে হচ্ছে।

### Fix
1. **নতুন component `src/components/app/InstallAppPrompt.tsx`**:
   - `usePwaInstall` hook ব্যবহার করে।
   - যদি `canInstall === true` (Chrome/Edge/Android) → একটা small floating bottom-sheet/banner দেখাবে: "অ্যাপ ইনস্টল করুন" + "ইনস্টল" বাটন + close (×) বাটন।
   - iOS হলে instruction (Share → Add to Home Screen) সহ একই banner।
   - **Frequency control** (localStorage):
     - `pwa-install-dismissed-at` timestamp save করব।
     - একই session এ আর show করবে না।
     - Dismiss করলে ৭ দিনের জন্য hide।
     - Install হয়ে গেলে কখনো আর show করবে না (`installed` flag)।
   - App load হওয়ার ~৮ সেকেন্ড পর show করবে (যাতে initial UX disturb না হয়)।
2. **AppTopbar / sidebar এ "অ্যাপ ইনস্টল" menu item**:
   - সবসময় available একটা manual button — user চাইলে যেকোনো সময় ক্লিক করে install করতে পারবে।
   - `canInstall` হলে সরাসরি install prompt; iOS হলে instruction dialog; already installed হলে button hide।
3. Banner টা `__root.tsx` এ mount করব যাতে সব পেজে কাজ করে।

## টেকনিক্যাল ডিটেইলস

**Files তৈরি হবে:**
- `src/routes/app.online-shop.index.tsx` (dashboard UI move)
- `src/routes/app.online-shop.delivery.tsx`
- `src/routes/app.online-shop.featured.tsx`
- `src/routes/app.online-shop.marketing.tsx`
- `src/routes/app.online-shop.policy.tsx`
- `src/components/app/InstallAppPrompt.tsx`

**Files modify হবে:**
- `src/routes/app.online-shop.tsx` — শুধু layout (`<Outlet />`) থাকবে।
- `src/routes/__root.tsx` — `<InstallAppPrompt />` mount।
- `src/components/app/AppTopbar.tsx` (বা settings menu) — manual "Install app" button।

**Install prompt logic:**
```ts
const KEY = "pwa-install-dismissed-at";
const HIDE_DAYS = 7;
const dismissed = Number(localStorage.getItem(KEY) || 0);
const shouldShow = !installed && canInstall && Date.now() - dismissed > HIDE_DAYS * 86400_000;
```

ইনস্টল prompt একটা session এ একবার-ই trigger হবে (in-memory `shown` ref)।

## ফলাফল
- Online-shop এর প্রতিটা টাইল ক্লিকে সঠিক পেজ render হবে — freeze বন্ধ।
- যেগুলো এখনো বানানো হয়নি সেগুলো "Coming soon" দেখাবে, freeze হবে না।
- Chrome/Edge/Android user "Install" বাটনে ১ ক্লিকে অ্যাপ install করতে পারবে।
- Auto popup আসবে, dismiss করলে ৭ দিন আর আসবে না।