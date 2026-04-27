## সমস্যা ও সমাধান

### সমস্যা ১: "Email rate limit exceeded" error owner signup এ

**কারণ:** `signup-with-pin` edge function `admin.auth.admin.createUser()` কল করে যেখানে `email_confirm: true` এবং `phone_confirm: true` পাঠানো হচ্ছে। Supabase project এ default SMTP enabled থাকলে এটা confirmation/notification email পাঠানোর চেষ্টা করে — Supabase free SMTP এর rate limit (~3-4 emails/hour) অতিক্রম হলে এই error আসে। গ্রাহক signup function এ `phone_confirm` পাঠানো হয় না বলে সেটায় কম সমস্যা হয়।

**ফিক্স:**
1. `signup-with-pin` এবং `customer-signup-with-pin` দুটোতে `createUser()` call refactor করা — এমন কিছু না পাঠানো যা email পাঠানোর trigger করে। শুধু `email_confirm: true` রেখে `phone` field সম্পূর্ণ বাদ দেওয়া (phone শুধু `profiles.phone` এ store করা হবে, auth.users এ না — যাতে Supabase কোনো phone OTP/notification পাঠানোর চেষ্টা না করে)।
2. Email format এ noreply-ish unique domain ব্যবহার করা যাতে duplicate detection trigger না হয়।
3. error message handling improve করা যাতে user friendly Bangla message দেখায় ("কিছুক্ষণ পর আবার চেষ্টা করুন" — rate limit এর জন্য)।

### সমস্যা ২: Owner signup এ shop type এবং sample product import জিজ্ঞেস না করা

বর্তমানে owner signup form এ শুধু: নাম, দোকানের নাম, ফোন, PIN। Shop type পরে `AppLayout` এ আলাদা "Setup shop" screen এ আসে। User চান এটা signup এর সাথেই integrated হোক।

**ফিক্স:** Owner signup কে **2-step flow** এ পরিবর্তন:

```text
Step 1: নাম, দোকানের নাম, দোকানের ধরন (ShopTypePicker)
        ফোন, ৪-সংখ্যার PIN
        [Account তৈরি করুন]
                ↓
Step 2 (signup এর পর শেষে দেখাবে):
        "✨ Sample products import করবেন?"
        - হ্যাঁ → SampleProductImportSheet খুলবে (shop type অনুযায়ী)
        - না, আমি নিজে যোগ করব → Direct dashboard
```

এর ফলে `AppLayout` এর "Setup shop" screen আর দেখাবে না (কারণ shop ইতিমধ্যে signup এ তৈরি হয়ে গেছে)।

## কারিগরি পরিবর্তন

### Edge Functions
- `supabase/functions/signup-with-pin/index.ts`:
  - `createUser()` থেকে `phone` parameter সরানো (rate limit এড়াতে)
  - `shop_type_code` parameter accept করা এবং `shops` insert এ ব্যবহার করা
  - Shop create এর পর shop_type এর `default_categories` seed করা (যেমন AppLayout করে)
  - Rate limit error detect করে friendly response: `{ error: "rate_limit" }`
- `supabase/functions/customer-signup-with-pin/index.ts`:
  - একই rate-limit safe pattern apply করা

### Frontend (`src/pages/Auth.tsx`)
- Owner signup tab এ `ShopTypePicker` component যোগ করা (নাম + দোকানের নাম এর পরে)
- Validation: shop type required for owner signup
- `signup-with-pin` কল এ `shop_type_code` পাঠানো
- Signup success এর পর: state update করে inline "Sample import করবেন?" prompt দেখানো (২টা button: হ্যাঁ / না)
  - হ্যাঁ → `localStorage` flag set + dashboard এ navigate (dashboard বা AppLayout flag দেখে SampleProductImportSheet auto-open করবে)
  - না → direct dashboard
- "Email rate limit" error এর জন্য Bangla message: "একটু পরে আবার চেষ্টা করুন (rate limit)"

### `src/pages/app/AppLayout.tsx`
- "Setup shop" screen (lines 174-200) সরানো — shop এখন signup এই তৈরি হয়
- যদি কোনো legacy user shop ছাড়া থাকে, fallback হিসাবে `/auth` এ redirect না করে একটা ছোট "দোকান তৈরি করুন" button দেখানো যা existing flow এ যাবে (edge case)
- Mount এ `localStorage` থেকে `pending_sample_import` flag check করে SampleProductImportSheet auto-open

### Database
কোনো schema change দরকার নেই — `shops.shop_type_code`, `shop_types.default_categories` ইতিমধ্যে আছে।

## ফলাফল

- ✅ Owner signup এ shop type জিজ্ঞেস করা হবে
- ✅ Signup success এর পর sample product import option আসবে
- ✅ "Email rate limit" error আর আসবে না (কারণ phone/email confirmation trigger বন্ধ)
- ✅ আলাদা onboarding step নেই — সব signup এই হয়ে যাবে
