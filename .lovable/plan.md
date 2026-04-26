## লক্ষ্য

মোবাইলে side drawer menu আর দরকার নাই। সব menu গুলো dashboard (`/app/dashboard`) home page এ category-wise scrollable list হিসেবে চলে আসবে। Settings sheet এ "দোকান পরিবর্তন", "Combined Report" ইত্যাদি আগে থেকেই আছে — সেগুলো ঠিক রেখে মোবাইলে profile/logout এর জন্য সুন্দর entry point দেব।

## কী করবো

### 1. Dashboard কে full menu hub বানানো (`src/routes/app.dashboard.tsx`)

বর্তমান dashboard এ summary card + 3 action button + ছোট ছোট grid (Ledgers / Business / Others) আছে — কিন্তু onlineshop sub-pages, B2B, Fordo history, returns ইত্যাদি অনেক menu এখানে নেই।

Dashboard এ একই category structure use করব যা `AppSidebar.tsx` এ আছে (single source of truth):

- `SECTIONS` array (main, transactions, ledgers, inventory, customers, online, reports, more) `AppSidebar` থেকে export করে dashboard এ reuse করব। এতে future এ নতুন menu add করলে দুই জায়গাতেই auto আসবে।
- প্রতি section একটা card; card এর ভেতর icon + label এর responsive grid (mobile ৪ column, desktop ৬ column)।
- Permission filter (`usePermissions`) এবং language (`useI18n`) সম্মান করবে — sidebar এর মতই।
- Summary card, banner carousel, ৩টা বড় action button (Purchase / Sell / Quick Sell) উপরে থাকবে — পরিবর্তন হবে না।

### 2. মোবাইলে sidebar drawer সরানো (`src/routes/app.tsx`)

- `mobileMenuOpen` state এবং `<Sheet>` যেটা `<AppSidebar>` mobile drawer হিসেবে দেখায় — সেটা বাদ দেব।
- `MobileBottomNav` এ `onMenu` prop আর use হবে না।
- Desktop এ `<AppSidebar>` আগের মতই থাকবে (`hidden md:block`)।

### 3. Mobile bottom nav update (`src/components/app/MobileBottomNav.tsx`)

5টা tab: **Home / Sell / Return / Report / Profile**

- "Menu" button সরিয়ে "Profile" button দেব (User icon)।
- Profile button click করলে SettingsSheet open হবে (দোকান পরিবর্তন, combined report, language, theme, logout — সব এখানেই আছে)।
- এর জন্য `MobileBottomNav` কে `onProfile: () => void` prop দেব। `app.tsx` থেকে ওই handler দিয়ে SettingsSheet open করব।

### 4. Settings sheet — মোবাইল থেকে access (`src/routes/app.tsx`)

- `app.tsx` এ একটা `settingsOpen` state নেব এবং `<SettingsSheet>` render করব (এখন AppTopbar এর মধ্যে আছে — ওটাও থাকবে desktop এর জন্য)।
- Mobile bottom nav এর Profile button → এই sheet খুলবে।
- SettingsSheet এ "দোকান পরিবর্তন", "Combined Report", language, theme, install app, training, logout — সব আগে থেকেই আছে, কোনো পরিবর্তন লাগবে না।

### 5. SettingsSheet — profile header যোগ (`src/components/app/SettingsSheet.tsx`)

মোবাইলে profile ভাব আনতে sheet এর top এ একটা ছোট profile header section যোগ করব:
- User initials avatar + full name + phone number
- নিচে আগের মতই "দোকান পরিবর্তন" বড় button

এটা desktop dropdown এ যেমন profile info দেখায় তেমনই হবে।

## প্রযুক্তিগত বিবরণ

**Files to modify:**
- `src/components/app/AppSidebar.tsx` — `SECTIONS` constant এবং `Item`/`Section` type export করব (desktop sidebar UI অপরিবর্তিত)।
- `src/routes/app.dashboard.tsx` — imported `SECTIONS` দিয়ে category-wise grid sections render করার নতুন block যোগ করব (existing summary + 3-button keep)।
- `src/components/app/MobileBottomNav.tsx` — Menu → Profile (User icon), prop `onMenu` → `onProfile`.
- `src/routes/app.tsx` — mobile drawer Sheet ও `mobileMenuOpen` state remove; `settingsOpen` state add; `<SettingsSheet>` render; `MobileBottomNav` কে `onProfile={() => setSettingsOpen(true)}` pass করব।
- `src/components/app/SettingsSheet.tsx` — sheet top এ profile header (avatar + name + phone) যোগ করব। `useAuth()` থেকে `profile` import করব (signOut ইতিমধ্যে use হচ্ছে)।

**Permission/i18n consistency:** dashboard এর নতুন menu grid sidebar এর `usePermissions` এবং `useI18n` logic একইভাবে use করবে যাতে permission নাই এমন menu hide হয়।

**No DB changes, no new routes।**
