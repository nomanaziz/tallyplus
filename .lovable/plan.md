## Goal
তিনটা জিনিস একসাথে ঠিক করা হবে:
1. বারবার আসা “অন্য device থেকে এই session শেষ করা হয়েছে” মেসেজ বন্ধ করা
2. Shop owner-এর জন্য active device log + remote logout আরও পরিষ্কারভাবে দেওয়া
3. Quick Order / দ্রুত বিক্রি page-টা mobile-first, readable, aligned layout-এ আনা

## What I found
- এই warning-এর source আছে `src/lib/auth.tsx`-এ। প্রতি 60 সেকেন্ডে `heartbeat_active_device()` call হয়, আর allowed `false` হলে toast + signout হয়।
- app `React.StrictMode`-এ চলছে (`src/main.tsx`), তাই dev/preview-তে auth effect দুবার run হওয়ার chance আছে। এখনকার code-এ heartbeat interval setup হওয়ার আগে device registration fully settled না থাকলে false detect হয়ে repeated signout/toast feel হতে পারে.
- Two-device session system already আছে:
  - DB table: `user_active_sessions`
  - RPC: `register_active_device`, `heartbeat_active_device`
  - UI component: `src/components/app/ActiveDevicesDialog.tsx`
  - Settings entry: `src/components/app/SettingsSheet.tsx`
- কিন্তু বর্তমান device management UI hidden/limited — user সহজে বুঝতে পারছে না কোথা থেকে active device log দেখবে, কোন device current, আর অন্য device logout করবে।
- Quick Order mobile issue-এর root cause `src/pages/app/QuickOrder.tsx`-এ item row `grid-cols-12` one-line compact desktop style-এ বানানো। Mobile-এ product name, cost, sell, qty, unit সব একই horizontal row-এ গিয়ে unreadable হয়ে গেছে — screenshot-এর problem code-এর সাথে exactly match করছে.

## Implementation plan

### 1) Session warning logic stabilize করা
`src/lib/auth.tsx`-এ device session heartbeat flow harden করব যাতে false positive কমে যায়.

কাজগুলো:
- registration success হওয়ার আগে heartbeat aggressive ভাবে না চালানো
- signout warning একবার দেখিয়ে stop করা, যেন looped toast না আসে
- app already signing out / session gone হলে আর heartbeat run না করে
- tab visibility/focus-aware heartbeat করা, background tab-এ unnecessary churn কমানো
- remote eviction detect হলে clean signout helper use করা
- optional grace/retry logic রাখা: প্রথম false response-এ সঙ্গে সঙ্গে logout না করে একবার re-check করা

Expected result:
- “অন্য device থেকে এই session শেষ করা হয়েছে” toast বারবার আসবে না
- বাস্তবে third device login করে পুরনো device evict হলে তবেই clean message দেখাবে

### 2) Shop owner-এর জন্য clear device log + logout control
Existing `ActiveDevicesDialog` এবং settings entry improve করব.

কাজগুলো:
- Settings sheet-এ device/session option-টা আরও prominent label-এ দেখানো
- active device list-এ current device, last seen, login time, browser/device label পরিষ্কারভাবে দেখানো
- per-device “logout” action clearer text/button-এ দেওয়া
- “logout other devices” action improve করা
- list refresh / empty state / loading state polish করা
- current device row visually highlight করা
- wording বাংলায় better করা যাতে user বুঝে: কয়টা device active আছে, কোনটা current, কোনটা remove করলে কী হবে

যদি দরকার হয়, route-based dedicated screen (`/app/account-sessions` টাইপ) add করব; নইলে existing dialog-টাই strong করে দেব. Existing codebase already dialog support করে, তাই প্রথম preference হবে minimal change with better discoverability.

### 3) Quick Order mobile layout redesign
`src/pages/app/QuickOrder.tsx`-এ items section mobile-first করে restructure করব.

নতুন row behavior:
- Product name full width top line-এ থাকবে
- External/store badge ও unit ছোট meta row-এ থাকবে
- Cost / Sell / Qty fields labeled mini boxes/card style-এ থাকবে
- এক লাইনে জায়গা না হলে 2-line / stacked layout use হবে
- Profit + Total নিচে summary row-এ থাকবে
- delete button compact corner action হবে
- desktop-এ compact feel রাখা হবে, mobile-এ stacked readability priority পাবে

Planned visual structure:
```text
[1] Product name...................[delete]
[External badge] [pcs]
[ক্রয়]   [বিক্রয়]   [Qty]
লাভ: ৳xx                      মোট: ৳xx
```

আরও polish:
- inputs-এর height/width mobile-friendly করা
- row card spacing এবং label add করা যাতে “কোনটা কিসের ঘর” সঙ্গে সঙ্গে বোঝা যায়
- totals section spacing একটু improve করা
- optional customer info block already okay, শুধু consistency দেখব

### 4) Keep behavior intact while only fixing UX
Quick Order-এর existing logic change করব না যেখানে না লাগলে:
- search/add product flow same থাকবে
- external item support same থাকবে
- convert to sale logic same থাকবে
- print dialog same থাকবে, unless layout dependency থেকে tiny adjustment লাগে

## Files likely to change
- `src/lib/auth.tsx`
- `src/components/app/ActiveDevicesDialog.tsx`
- `src/components/app/SettingsSheet.tsx`
- `src/pages/app/QuickOrder.tsx`
- possibly `src/components/app/AppTopbar.tsx` or route config only if a dedicated session screen is needed

## Technical notes
- DB migration probably লাগবে না, কারণ `user_active_sessions` table + RPC already আছে.
- যদি দেখি session management-এর জন্য extra metadata দরকার, তখন separate migration propose করব; কিন্তু current read suggests frontend fix দিয়েই অনেকটা solve হবে.
- Quick Order redesign হবে existing component-এর ভিতরেই; নতুন page architecture লাগবে না.

## After implementation I will verify
- same device-এ normal browsing করলে warning বারবার না আসে
- settings থেকে active devices list খোলা যায়
- অন্য device remove করা যায়
- Quick Order mobile view-এ product name, unit, qty, cost, sell clearly readable
- small screen-এ fields overlap/truncate না হয়

Approve করলে আমি next step-এ implementation শুরু করব.