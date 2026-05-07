## Problem

Shop owner `NewUserAccessDialog` থেকে employee তৈরি করলে শুধু **phone + PIN** set হয় (via `create-employee-user`)। কোনো email/password employee-কে দেওয়া হয় না।

কিন্তু `login-with-pin` edge function এ একটা guard আছে:

```ts
const { data: employeeRow } = await admin
  .from("shop_members")
  .select("user_id")
  .eq("user_id", profile.id)
  .limit(1)
  .maybeSingle();
if (employeeRow) return json({ ok: false, error: "employee_must_use_email" });
```

এর মানে — যেহেতু user `shop_members` এ আছে, PIN-login block হয়ে যাচ্ছে এবং UI সেই message দেখাচ্ছে: "Employee হিসেবে email + password দিয়ে login করুন"। অথচ employee-র কোনো password-ই নেই → সে কোনোভাবেই ঢুকতে পারছে না।

## Fix

`supabase/functions/login-with-pin/index.ts` থেকে employee block সম্পূর্ণ সরিয়ে দিতে হবে। Employees কে phone+PIN দিয়েই login করতে দেওয়া হবে (এটাই owner-এর share করা credential)। Admin block (`admin_must_use_email`) আগের মতই থাকবে — security-র জন্য।

## Frontend cleanup

`src/components/site/LoginCard.tsx`-এ `employee_must_use_email` error handling থাকতে পারে, তবে server থেকে আর never আসবে। কোনো বাড়তি UI পরিবর্তন দরকার নেই।

## Verification

Owner একটা new employee account তৈরি করার পর শেয়ার করা phone + 4-digit PIN দিয়ে "ব্যবসায়িক হিসাব" tab থেকে লগইন → `/app/dashboard` এ পৌঁছাবে এবং তার assigned permissions নিয়ে কাজ করতে পারবে।
