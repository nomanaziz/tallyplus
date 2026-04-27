# Plan: Header/Footer on public pages + Redesigned 404

## Goal
- Auth (`/auth`) এ SiteHeader এবং SiteFooter দেখাবে।
- সুন্দর 404 page design করা হবে SiteHeader + SiteFooter সহ এবং "Back to Home" বাটন থাকবে।
- যেসব public page এ header/footer নেই সেগুলোতেও add করা হবে।

## Scope clarification
Header/footer শুধুমাত্র **public marketing pages**-এ যোগ হবে। `/app/*` (shop dashboard) এবং `/admin/*` pages-এর নিজস্ব AppSidebar/AppTopbar/AdminSidebar আছে — সেখানে marketing header/footer যোগ করলে layout ভাঙবে, তাই touch করা হবে না।

## Changes

### 1. `src/pages/Auth.tsx`
- Component-এর root wrapper-এ `<SiteHeader />` (top) এবং `<SiteFooter />` (bottom) যোগ করা।
- Layout: `min-h-screen flex flex-col` → header, `<main className="flex-1">` এ existing form, footer।

### 2. `src/pages/NotFound.tsx` — সম্পূর্ণ রিডিজাইন
- SiteHeader + SiteFooter wrap।
- বড় gradient "404" number, illustration-style icon (lucide `Compass` বা `MapPinOff`), Bangla + English headline।
- দুটো action button:
  - **হোমে ফিরুন** → `/`
  - **Dashboard-এ যান** → `/app/dashboard` (login থাকলে দেখাবে, useAuth check)
- Helpful links section: Marketplace, Pricing, Contact।
- Card-style center container, responsive।

### 3. অন্যান্য public pages check
নিম্নলিখিত public pages-এ header/footer যোগ করা হবে যদি না থাকে:
- `src/pages/Affiliate.tsx`
- `src/pages/affiliate/Register.tsx`
- `src/pages/admin/Login.tsx` — admin হলেও public entry, header/footer যোগ করা হবে
- `src/pages/Pricing.tsx` (এটা শুধু redirect, skip)

(Index, Shop pages already have header/footer বা নিজস্ব marketplace layout।)

### 4. Routing safety
Existing `<Route path="*" element={<NotFound />} />` ইতিমধ্যে আছে — কাজ করবে। কোনো routing change দরকার নেই।

## Files to edit
- `src/pages/Auth.tsx` (wrap with header/footer)
- `src/pages/NotFound.tsx` (redesign + header/footer)
- `src/pages/admin/Login.tsx` (add header/footer)
- `src/pages/Affiliate.tsx` (verify + add if missing)
- `src/pages/affiliate/Register.tsx` (verify + add if missing)

## Out of scope
- `/app/*` এবং `/admin/*` (login ছাড়া) dashboard pages — সেগুলোর নিজস্ব chrome আছে।
