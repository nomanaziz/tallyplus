# Admin Panel Plan

## Goal
একটি আলাদা Admin Panel তৈরি করব যেখানে আপনি email + password দিয়ে login করে platform-এর সব user, subscription, plan এবং permission manage করতে পারবেন। আপনার দেওয়া credentials (`nomanaziz33@gmail.com` / `Galaxy@123`) bootstrap করে দেব এবং পরে settings থেকে change করার option থাকবে।

## কোথায় কী থাকবে (User Guide)

| Page | URL | কাজ |
|------|-----|-----|
| Admin Login | `/admin/login` | Email + Password দিয়ে login |
| Dashboard | `/admin` | মোট user, active subscription, pending request, expiring soon, revenue summary |
| Users | `/admin/users` | সব user list, search, suspend/unsuspend, role দেখানো, manual subscription grant |
| Subscription Requests | `/admin/subscription-requests` | Pending payment request approve/reject — approve করলে subscription auto-activate |
| Active Subscriptions | `/admin/subscriptions` | Active subs list, "expiring in 7 days" filter, extend/cancel |
| Plans | `/admin/plans` | Subscription plan create / edit / activate / deactivate |
| Settings | `/admin/settings` | Admin নিজের email + password change করতে পারবে |

## Implementation

### 1. Bootstrap Admin (SQL Migration)
- `bootstrap_admin(_email text, _password text)` — SECURITY DEFINER function যেটা `auth.users`-এ user create করে এবং `user_roles`-এ `admin` role insert করে। শুধু একবার চালানো হবে আপনার দেওয়া credentials দিয়ে।
- Function-টা শেষে drop হয়ে যাবে যাতে security risk না থাকে।

### 2. Routes (file-based, TanStack)
```
src/routes/
  admin.login.tsx          → public, email/password form
  admin.tsx                → layout + beforeLoad guard (is_admin check)
  admin.index.tsx          → /admin dashboard
  admin.users.tsx
  admin.subscription-requests.tsx
  admin.subscriptions.tsx
  admin.plans.tsx
  admin.settings.tsx
```

### 3. Auth Flow
- `/admin/login` সম্পূর্ণ আলাদা — main app-এর phone/PIN auth-এর সাথে কোনো conflict নেই।
- Supabase `signInWithPassword({ email, password })` ব্যবহার হবে।
- Login success হলে `is_admin(auth.uid())` check করা হবে (existing function)। Admin না হলে immediately sign out + error message।
- Admin layout-এ `beforeLoad` guard থাকবে — non-admin user `/admin/*` access করতে পারবে না, redirect হবে `/admin/login`-এ।

### 4. Settings page
- Email change: `supabase.auth.updateUser({ email })`
- Password change: current password verify করে `supabase.auth.updateUser({ password })`

### 5. Security
- সব write action existing RLS policy দিয়ে gated (`is_admin(auth.uid())` already enforced on `subscriptions`, `subscription_plans`, `user_roles`).
- Service role key client-এ কখনো expose করা হবে না।

## Approve করলে
1. Migration চালাব (bootstrap admin + cleanup function)
2. সব admin route + UI build করব
3. Login করার URL দিয়ে দেব: `/admin/login`

Email: `nomanaziz33@gmail.com` · Password: `Galaxy@123` (পরে Settings থেকে change করতে পারবেন)
