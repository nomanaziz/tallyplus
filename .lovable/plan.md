# Plan: সহজ Signup/Login (OTP বাদ)

## লক্ষ্য
ইউজার শুধু **৪টা ইনফরমেশন** দিয়ে account তৈরি করে সরাসরি dashboard-এ ঢুকে যাবে:
1. নাম (Full Name)
2. ফোন নাম্বার
3. দোকানের নাম
4. ৪-সংখ্যার PIN

পরের বার একই ফোন নাম্বার + PIN দিলে auto login হবে। কোনো OTP নেই।

## নতুন Auth Flow

### `/auth` পেজে দুটো Tab থাকবে:

**Tab 1: "নতুন একাউন্ট" (Sign Up)**
- নাম
- ফোন নাম্বার (01XXXXXXXXX)
- দোকানের নাম
- ৪-সংখ্যার PIN
- "একাউন্ট তৈরি করুন" বাটন → সাথে সাথে login হয়ে dashboard-এ চলে যাবে

**Tab 2: "লগইন" (Login)**
- ফোন নাম্বার
- ৪-সংখ্যার PIN
- "লগইন" বাটন → dashboard

## Backend পরিবর্তন

### দুটো নতুন Edge Function:

**1. `signup-with-pin`** (নতুন)
- Input: `{ phone, full_name, shop_name, pin }`
- ফোন নাম্বার normalize (+880…)
- ফোন already exists কিনা check — থাকলে error: "এই নাম্বার দিয়ে আগে একাউন্ট আছে, লগইন করুন"
- `auth.admin.createUser` দিয়ে user তৈরি (synthetic email: `<digits>@tally.local`, deterministic password)
- Trigger automatically `profiles` ও `user_roles(owner)` row বানাবে (already setup আছে)
- Server-side bcrypt দিয়ে PIN hash করে `profiles.pin_hash`-এ সেভ + `full_name` update
- ওই user-এর জন্য `shops` row insert (owner_id = new user)
- Login করিয়ে `access_token` + `refresh_token` ফেরত দেবে

**2. `login-with-pin`** (নতুন)
- Input: `{ phone, pin }`
- ফোন normalize → synthetic email বানিয়ে user lookup
- `profiles.pin_hash` এর সাথে bcrypt compare
- Match হলে session token issue করে ফেরত
- Mismatch হলে: "ভুল PIN" error

### পুরোনো `send-otp` ও `verify-otp`
ফাইল রেখে দেব কিন্তু আর use হবে না (ভবিষ্যতের জন্য)।

## Frontend পরিবর্তন

### `src/routes/auth.tsx` সম্পূর্ণ rewrite
- shadcn `Tabs` component দিয়ে Signup/Login দুটো tab
- Default tab: **Signup** (যেহেতু নতুন ইউজার বেশি)
- Form validation:
  - ফোন: `01XXXXXXXXX` (১১ ডিজিট, 01 দিয়ে শুরু)
  - PIN: ঠিক ৪ ডিজিট
  - নাম ও দোকানের নাম: খালি না
- Success হলে `supabase.auth.setSession()` → `nav("/app")`

### `src/lib/i18n.tsx` এ নতুন strings যোগ
`signup`, `createAccount`, `fullName`, `shopName`, `pin4Digit`, `loginWithPin`, `phoneExists`, `wrongPin` ইত্যাদি (Bangla + English)।

### `src/routes/app.tsx` (Dashboard)
যেহেতু signup-এর সময়ই shop তৈরি হয়ে যাচ্ছে, "shop setup wizard" আর দেখাবে না। সরাসরি dashboard।

## Database
কোনো schema migration লাগবে না — সব column (`profiles.pin_hash`, `profiles.full_name`, `shops.name`, `shops.owner_id`) আগেই আছে।

## Technical Notes (টেকনিক্যাল)
- bcryptjs (already installed) edge function-এ esm.sh থেকে import হবে
- Synthetic email pattern (`<digits>@tally.local`) আগের মতই থাকবে → ফোন নাম্বার deterministic identifier
- PIN কখনো plaintext-এ store হবে না, bcrypt hash (10 rounds) ব্যবহার হবে
- Service role key দিয়ে user creation, anon key দিয়ে signInWithPassword

## ফাইল পরিবর্তনের সারাংশ
- **নতুন:** `supabase/functions/signup-with-pin/index.ts`, `supabase/functions/login-with-pin/index.ts`
- **Rewrite:** `src/routes/auth.tsx`
- **Edit:** `src/lib/i18n.tsx` (strings), `src/routes/app.tsx` (shop wizard remove), `supabase/config.toml` (নতুন function register)
- **অপরিবর্তিত:** `src/lib/auth.tsx` (already session-based), database schema

Approve করলে implement শুরু করব।
