## সমস্যা

মোবাইলে `SiteHeader`-এর navigation hidden (`hidden md:flex`)। ফলে মোবাইল visitor-রা মার্কেটপ্লেস (`/shop`), Features, Pricing, Contact কোনোটাই access করতে পারছে না — শুধু logo আর Login button দেখা যায়। ভেতরে `/app/*` route-গুলোতে `MobileBottomNav` থাকলেও, public site (`/`, `/shop`, ইত্যাদি) তে কোনো mobile navigation নেই।

## সমাধান

`SiteHeader`-এ একটা **hamburger menu (mobile only)** যোগ করব, যেটা থেকে marketplace সহ সব main page-এ যাওয়া যাবে। সাথে marketplace-কে আরো prominent করার জন্য কিছু extra entry point থাকবে।

### পরিবর্তন

**1. `src/components/site/SiteHeader.tsx`** (mobile hamburger যোগ)
- Desktop nav আগের মতোই থাকবে (`hidden md:flex`)।
- Mobile-এ একটা hamburger icon button দেখাব (`md:hidden`), যেটা `Sheet` (side drawer) খুলবে।
- Drawer-এ থাকবে: হোম, **মার্কেটপ্লেস** (highlighted, Store icon সহ), Features, Pricing, Contact, language toggle, theme toggle, এবং Login/Dashboard button।
- Header-এ logo-র পাশে মোবাইলে একটা ছোট "মার্কেটপ্লেস" shortcut icon button (Store icon) থাকবে — এক ট্যাপে `/shop`-এ যাবে, drawer খোলার দরকার নেই।

**2. `src/pages/Index.tsx`** (landing page — quick check)
- Hero বা stats section-এর কাছে যদি ইতিমধ্যেই "মার্কেটপ্লেস দেখুন" CTA না থাকে, একটা যোগ করব মোবাইল visibility-র জন্য। (file inspect করে decide করব।)

**3. `MobileBottomNav` (logged-in app users)** — অপরিবর্তিত
- এটা `/app/*` এর জন্য, public marketplace browsing flow-এর সাথে সম্পর্কহীন।

### Technical details

- shadcn `Sheet` (already used in project) ব্যবহার করব side="right" দিয়ে।
- Hamburger icon: `Menu` from `lucide-react`।
- Marketplace shortcut: `Store` icon button, `aria-label="মার্কেটপ্লেস"`।
- Sheet বন্ধ হবে যেকোনো link click-এ (`SheetClose` wrap করে)।

### Out of scope

- `/shop` page-এর internal layout পরিবর্তন (responsive grid আগেই `grid-cols-1 sm:grid-cols-2` দিয়ে কাজ করছে — সমস্যা শুধু entry point-এ)।
- Auth/subscription flow-এ পরিবর্তন।
