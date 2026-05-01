## সমস্যা

Customer dashboard ও money/fordo/notes পেজে card-গুলো `sm:grid-cols-2` / `sm:grid-cols-3` ব্যবহার করছে — মানে mobile (`<640px`) এ এক rowয়ে **একটা মাত্র** card দেখাচ্ছে, ফলে অনেক scroll লাগছে এবং single view-তে সব দেখা যাচ্ছে না। Owner dashboard ইতিমধ্যে `grid-cols-3 / grid-cols-4` ব্যবহার করে mobile-friendly।

## সমাধান

Mobile থেকেই multi-column grid চালু করব — `sm:` prefix বাদ দিয়ে base ক্লাসে cols সংখ্যা সরাসরি দেব এবং card-এর padding/font ছোট করব যাতে narrow screen-এ ঠিকঠাক fit হয়।

### ১. `src/pages/customer/Dashboard.tsx`

- **আয় / ব্যয় / ব্যালেন্স row**: `grid gap-3 sm:grid-cols-3` → `grid grid-cols-3 gap-2 sm:gap-3`। Card padding `p-4` → `p-3`, amount text `text-2xl` → `text-base sm:text-2xl`, label কে `truncate` করব যাতে narrow phone-এ overflow না হয়।
- **আমার ফর্দ / নোট / পাব / দেব row**: `grid gap-3 sm:grid-cols-2` → `grid grid-cols-2 gap-2 sm:gap-3`। Icon circle ছোট (`h-8 w-8` mobile, `sm:h-10 sm:w-10`), title `text-sm sm:text-base`, sub-text `text-[10px] sm:text-xs`। Layout vertical (icon উপরে, text নিচে) করব mobile-এ যাতে narrow card-এ পাশাপাশি দু'টা ভালো দেখায়; `sm:` থেকে আবার horizontal।

### ২. `src/pages/customer/Money.tsx`

- Summary row (line 211): `grid gap-3 sm:grid-cols-3` → `grid grid-cols-3 gap-2 sm:gap-3`। Stat card padding/text shrink।

### ৩. `src/pages/customer/MyFordo.tsx`

- লাইন 364, 396 (item lists), 449 (footer summary): `sm:grid-cols-2` → `grid-cols-2`। Spacing/font মাঝারিভাবে কমাব।

### ৪. `src/pages/customer/Notes.tsx`

- Notes grid (line 126): `sm:grid-cols-2` → `grid-cols-2` mobile থেকে। Note card-এর padding ও title text size হালকা কমাব।

## ফলাফল

Mobile-এ customer dashboard একবার দেখলেই — ৩টা summary stat (আয়/ব্যয়/ব্যালেন্স) এক row-এ, এবং ফর্দ/নোট/পাব/দেব ২×২ grid-এ — সব key info scroll না করে দেখা যাবে। Tablet/desktop-এ বর্তমান behavior অপরিবর্তিত।

## Owner dashboard

Owner dashboard (`src/pages/app/Dashboard.tsx`) ইতিমধ্যে `grid-cols-3` ও `grid-cols-4` mobile থেকেই ব্যবহার করছে, তাই সেখানে পরিবর্তন প্রয়োজন নেই। যদি আপনি বলেন owner dashboard-এও কোনো নির্দিষ্ট জায়গায় সমস্যা হচ্ছে, সেটা আলাদা করে বলুন।
