# Application Tour (প্রথমবার ব্যবহারকারীর জন্য গাইড)

নতুন ব্যবহারকারী যখন প্রথমবার অ্যাকাউন্ট তৈরি করে app-এ ঢুকবে, তখন একটা step-by-step tour চালু হবে যা তাকে দেখাবে কোথায় কী করতে হয়। ভাষা (`bn`/`en`) অনুযায়ী automatic দেখাবে।

## Tour-এর ৫টি ধাপ

1. **স্বাগতম** — অ্যাপের সংক্ষিপ্ত পরিচিতি ও "শুরু করুন" বাটন (ড্যাশবোর্ডে centered modal)।
2. **প্রোফাইল আপডেট করুন** — Sidebar-এ "প্রোফাইল" highlight হবে; tooltip: "প্রথমে আপনার নাম, ঠিকানা ও দোকানের তথ্য দিন।"
3. **স্টকে পণ্য যোগ করুন** — "পণ্য / Stock" menu highlight; tooltip: "আপনার দোকানের পণ্য যোগ করুন।"
4. **ক্রয় লিপিবদ্ধ করুন** — "ক্রয়" menu highlight; tooltip: "সরবরাহকারীর কাছ থেকে কেনা পণ্য এখানে যোগ করুন।"
5. **বিক্রয় শুরু করুন** — "বিক্রয়" menu highlight; tooltip: "কাস্টমারের কাছে বিক্রয় করে invoice তৈরি করুন।" শেষে "সম্পন্ন" বাটন।

প্রতিটি step-এ থাকবে: **পরবর্তী / আগে / এড়িয়ে যান (Skip)** বাটন এবং progress dots (1/5)।

## কোথায় দেখা যাবে
- শুধু **প্রথমবার** — শেষ হলে বা skip করলে আর আসবে না।
- Sidebar-এ ছোট **"Tour আবার দেখুন"** বাটন থাকবে যাতে যেকোনো সময় আবার দেখা যায়।

## Technical details
- লাইব্রেরি: `driver.js` (lightweight, ~10kb, কোনো dependency নেই, Worker-safe — শুধু client side)। বিকল্প `react-joyride` ভারী।
- State: `localStorage` key `tour_completed_v1` (per device) + optional `profiles.tour_completed` column যাতে multi-device sync হয়। শুরুতে শুধু localStorage যথেষ্ট, পরে DB-তে move করা যাবে।
- ভাষা: existing `useI18n()` hook থেকে `lang` নিয়ে step text bilingual object থেকে select হবে।
- Trigger: `AppLayout.tsx` mount-এ check — যদি user নতুন (account creation < 5 min অথবা flag false) → tour auto-start।
- Highlight selector: sidebar item-এ `data-tour="profile" | "products" | "purchase" | "sell"` attribute যোগ করা হবে `AppSidebar.tsx`-এ।
- নতুন ফাইল: `src/lib/tour.ts` (steps definition + start function), `src/components/app/AppTour.tsx` (mount component)।
- "Tour আবার দেখুন" বাটন: AppSidebar-এর footer-এ ছোট link/icon।

## Files to change
- `src/components/app/AppSidebar.tsx` — `data-tour` attributes + restart button
- `src/pages/app/AppLayout.tsx` — mount `<AppTour />`
- নতুন: `src/lib/tour.ts`, `src/components/app/AppTour.tsx`
- `package.json` — `bun add driver.js`
