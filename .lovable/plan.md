# Customer Auth Fix — Phone + PIN (No Email)

## সমস্যা

1. **"Email address invalid" error** — Customer signup currently builds a synthetic email `c8801999887766@tally.local` and calls `supabase.auth.signUp()` directly. Supabase Auth's email validator is rejecting the `c` prefix on this Supabase project (looks like an invalid TLD pattern to its validator).
2. **Customer signup এ PIN field নাই** — শুধু নাম + ফোন নেওয়া হচ্ছে।
3. **Customer login এ PIN field নাই** — শুধু ফোন নিচ্ছে, যা insecure।
4. **Customer login এ email/password fallback ব্যর্থ হচ্ছে** — কারণ signup নিজেই ব্যর্থ।

## সমাধান (Owner-এর মতই PIN-based flow)

দোকান মালিকের জন্য যে edge function-based PIN flow আছে (`signup-with-pin`, `login-with-pin`), গ্রাহকের জন্যও একই pattern follow করব। কোনো synthetic email frontend থেকে যাবে না — edge function ভিতরে user create করবে।

### ১. নতুন Edge Function: `customer-signup-with-pin`
- Input: `phone`, `full_name`, `pin` (4 digits)
- Phone normalize করে `<digits>@tallycustomer.local` format-এ email বানাবে (server-side, যাতে Supabase validator pass করে — দরকার হলে domain adjust করব)
- `admin.auth.admin.createUser` দিয়ে user create + `phone_confirm: true`, `email_confirm: true`, `user_metadata: { account_type: "consumer", full_name }`
- `handle_new_user` trigger automatically `consumer_profiles` row + `consumer` role দিবে
- `consumer_profiles` update: name, phone, **pin_hash** (bcrypt)
- Return access_token + refresh_token

### ২. নতুন Edge Function: `customer-login-with-pin`
- Input: `phone`, `pin`
- `consumer_profiles` থেকে pin_hash lookup → bcrypt verify
- Match হলে `signInWithPassword` (server-side fixed password) দিয়ে session issue করে token return

### ৩. DB Migration
- `consumer_profiles` table-এ `pin_hash text` column add (nullable for backward compat)
- Existing consumer rows-এ pin_hash NULL থাকবে — তারা নতুন করে সাইনআপ/PIN reset করতে হবে (currently শুধু test users আছে)

### ৪. Frontend (`src/pages/Auth.tsx`) Update

**Customer Signup Tab** (গ্রাহক):
- নাম (required)
- মোবাইল নম্বর (required)
- **৪ সংখ্যার PIN** (নতুন — required)
- "Account তৈরি করুন" → calls `customer-signup-with-pin` edge function
- Sets session, redirects to `/customer/dashboard`

**Customer Login Tab** (গ্রাহক):
- মোবাইল নম্বর (required)
- **৪ সংখ্যার PIN** (নতুন — required, এখন শুধু ফোন আছে)
- "লগইন" → calls `customer-login-with-pin` edge function
- Sets session, redirects to `/customer/dashboard`
- "PIN ভুলে গেছেন? WhatsApp করুন" link থাকবে (owner-এর মতই)

Validation update: `role === "customer"`-ও PIN required হবে।

### ৫. পুরনো broken code সরানো
`Auth.tsx` থেকে `customerEmail`/`customerPassword` synthetic email logic আর `supabase.auth.signUp` direct call সরাবো — সব edge function এ চলে যাবে।

## Files Changed

- **Migration**: `consumer_profiles` table-এ `pin_hash` column add
- **New**: `supabase/functions/customer-signup-with-pin/index.ts`
- **New**: `supabase/functions/customer-login-with-pin/index.ts`
- **Edited**: `src/pages/Auth.tsx` — customer signup এ PIN field, customer login এ PIN field, edge function calls

## Result

- ✅ "Email address invalid" error চলে যাবে (proper domain + server-side handling)
- ✅ গ্রাহক signup: নাম + ফোন + PIN
- ✅ গ্রাহক login: ফোন + PIN (secure)
- ✅ দোকান মালিকের সাথে consistent UX
