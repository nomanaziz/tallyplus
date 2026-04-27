## সমস্যা

`src/routes.tsx`-এ admin route মিস-wired:
- Line 93: `<Route path="/admin" element={<S><P2 /></S>}>` — এখানে `P2` হলো `pages/admin/Index.tsx` (Overview page), কিন্তু এটাকে layout হিসেবে use করা হচ্ছে। Overview page-এ `<Outlet/>` বা sidebar নেই, তাই sidebar render হয় না এবং child routes (banners, plans, ইত্যাদি) overview-এর ভেতরে কখনো mount হয় না।
- Line 110: `<Route path="/admin" element={<S><P12 /></S>}>` — `P12` হলো আসল `pages/Admin.tsx` (AdminLayout, sidebar সহ), কিন্তু এর body **empty**, কোনো child route declare করা নেই।

ফলে sidebar পুরোপুরি হারিয়ে গেছে এবং `/admin/banners` কাজ করলেও sidebar ছাড়া render হচ্ছে।

---

## পরিবর্তনসমূহ

### ১) `src/routes.tsx` — admin block একীভূত করা

দুইটা `/admin` block মার্জ করব একটাতে:
- Layout হিসেবে `P12` (`pages/Admin.tsx` → AdminLayout with sidebar) ব্যবহার করব।
- `index` route → `P2` (Overview page) — `/admin`-এ গেলে sidebar + Overview দেখাবে।
- বাকি সব child routes (`banners`, `plans`, `usage-limits`, `promo-popups`, `payment-gateway`, `users`, `landing`, `marketplace`, `settings`, `shop-types`, `subscription-requests`, `subscriptions`, `training`, `affiliates`, `login`) ভেতরে নিয়ে আসব।
- ডুপ্লিকেট empty `/admin` block (লাইন 110-112) মুছে ফেলব।

ফলাফল: AdminSidebar-এ ইতিমধ্যে declared সব menu item (Overview, Landing Page, Users, Shop Types, Subscription Requests, Subscriptions, Plans, Usage Limits, Promo Popups, Payment Gateway, Marketplace, Banners, Training, Affiliates, Settings) আবার দেখা যাবে এবং কাজ করবে।

### ২) Bookmark icon ও favicon

- `user-uploads://icons8-bookmark-100.svg` কপি করব দুই জায়গায়:
  - `public/favicon.svg` — browser tab favicon হিসেবে।
  - `src/assets/icons/bookmark.svg` — যদি UI-তে icon হিসেবে ব্যবহার করতে চান।
- `index.html` update:
  - `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` যোগ করব (existing PNG icon fallback রেখে দেব Apple/PWA-এর জন্য)।
- `src/lib/icons.ts`-এ `bookmark` key যোগ করব যাতে যেকোনো page থেকে `icons.bookmark` দিয়ে use করা যায়।

---

## যাচাই

- `/admin` খুললে বাম পাশে full sidebar দেখা যাবে এবং Overview content render হবে।
- Sidebar-এর প্রতিটি link (banners, plans, usage-limits ইত্যাদি) click করলে sidebar বহাল থেকে content swap হবে।
- Browser tab-এ নতুন bookmark favicon দেখা যাবে।

---

## প্রভাবিত ফাইল

- `src/routes.tsx` (edit — admin block ঠিক)
- `index.html` (edit — favicon link)
- `public/favicon.svg` (new)
- `src/assets/icons/bookmark.svg` (new)
- `src/lib/icons.ts` (edit — bookmark key যোগ)
