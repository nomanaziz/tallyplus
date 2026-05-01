## লক্ষ্য

গ্রাহক portal-এর navigation simplify করব। শপের dashboard যেমন main page-এ সব link/icon দেখায়, গ্রাহক dashboard-ও সেভাবে কাজ করবে — তাই side/bottom nav-এ অল্প কয়েকটা মূল item রাখব।

## পরিবর্তন

### ১. Navigation কমাও (৪টি item)

`src/pages/customer/CustomerLayout.tsx`-এ `NAV` array থেকে এখনকার ৭টি item:
ড্যাশবোর্ড, আমার ফর্দ, আমার অর্ডার, আয়-ব্যয়, নোট, ট্রেনিং, প্রোফাইল

→ কমিয়ে ৪টি করব:
1. **ড্যাশবোর্ড** (`/customer/dashboard`)
2. **আমার ফর্দ** (`/customer/my-fordo`)
3. **আমার অর্ডার** (`/customer/my-orders`)
4. **ঠিকানা / আরও** (`/customer/profile`) — এটাতে গেলে অন্যান্য সব (আয়-ব্যয়, নোট, ট্রেনিং, প্রোফাইল edit, ঠিকানা) পাওয়া যাবে।

Mobile bottom nav-ও একই ৪টি দেখাবে (এখন `grid-cols-7` → `grid-cols-4`)।

### ২. Dashboard-এ সব শর্টকাট icon

`src/pages/customer/Dashboard.tsx`-এ এখন ৪টা card আছে (ফর্দ, নোট, পাব, দেব)। এটাকে শপের `Dashboard.tsx`-এর মত একটা grid-of-shortcuts বানাব — গ্রাহকের জন্য প্রাসঙ্গিক সব menu icon সহ:

- আমার ফর্দ → `ListChecks`
- আমার অর্ডার → `ShoppingBag`
- আয়-ব্যয় → `Wallet`
- নোট → `NotebookPen`
- ট্রেনিং → `GraduationCap`
- প্রোফাইল / ঠিকানা → `User`
- পাব → `ArrowDownLeft`
- দেব → `ArrowUpRight`

আয়/ব্যয়/ব্যালেন্স summary card উপরে যেমন আছে রেখে দেব।

### ৩. "আরও" page (Profile-এ গৃহীত)

`src/pages/customer/Profile.tsx`-এর উপরে একটা ছোট link grid যোগ করব (আয়-ব্যয়, নোট, ট্রেনিং, ঠিকানা edit) যাতে nav থেকে সরানো item-গুলো এখান থেকে এক ক্লিকে পাওয়া যায়। Profile তথ্য নিচে থাকবে।

### Icon consistency

শপের dashboard যে lucide icon ব্যবহার করে (`ShoppingBag`, `ListChecks`, `Wallet`, `NotebookPen`, `User`, `GraduationCap`) — গ্রাহক side-এও একই icon-set ব্যবহার করব, আলাদা কিছু আনব না।

## Files

- `src/pages/customer/CustomerLayout.tsx` — `NAV` ৪টি item, mobile `grid-cols-4`
- `src/pages/customer/Dashboard.tsx` — সব শর্টকাট card grid যোগ
- `src/pages/customer/Profile.tsx` — উপরে "আরও" links grid

কোনো নতুন route বা DB change নেই — শুধু UI restructure।
