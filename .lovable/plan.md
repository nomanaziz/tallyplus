## লক্ষ্য

1. Admin/employee login শুধু **email + password** দিয়ে — phone+PIN দিয়ে নয়
2. **Super admin** (সবচেয়ে প্রথম admin) কখনো revoke/delete হবে না
3. প্রতিটা admin team member এর জন্য আলাদা **page permissions** set করা যাবে (যেমন: Users, Marketplace, Subscriptions, Categories ইত্যাদি)
4. বর্তমানে phone+PIN দিয়ে login করা admin (আপনি) — নিজের email/password set করার option দেওয়া হবে

## Database changes (migration)

নতুন table `public.admin_profiles`:
- `user_id uuid PK` → references `auth.users`
- `email text not null unique`
- `full_name text`
- `is_super boolean default false` — super admin flag, একবার true হলে protected
- `permissions jsonb default '{}'` — যেমন `{"users": true, "marketplace": true, "subscriptions": false, ...}`
- `created_at, updated_at`

RLS:
- SELECT/UPDATE: যদি user admin role হয় (নিজের row দেখতে/edit করতে পারবে), super admin সব দেখবে/edit করবে
- INSERT/DELETE: শুধু super admin

Helper function `public.has_admin_perm(_user_id uuid, _key text) returns boolean` — super হলে true, নাহলে `permissions->>_key = 'true'` চেক করে।

Trigger `tg_protect_super_admin` on `user_roles`:
- যদি delete করা row এর role = 'admin' এবং সেই user `admin_profiles.is_super = true` হয় → exception
- একইভাবে `admin_profiles` row delete বা `is_super = false` করতে দেওয়া হবে না super admin এর জন্য

বর্তমান existing admin (`f4d64af7-...`) এর জন্য `admin_profiles` row insert হবে `is_super = true` দিয়ে — email পরে নিজে set করবেন।

## Edge functions

**নতুন: `create-admin-user`** (super admin only)
- input: `email`, `password`, `full_name`, `permissions`
- service role দিয়ে `auth.admin.createUser({ email, password, email_confirm: true })`
- `user_roles` এ admin role insert
- `admin_profiles` এ row insert (is_super: false, permissions: provided)

**নতুন: `set-admin-credentials`** (admin user নিজের জন্য)
- input: `email`, `password` (নতুন), authenticated caller
- caller এর existing auth user এর email + password update via `auth.admin.updateUserById`
- `admin_profiles.email` update
- বিশেষ করে phone+PIN দিয়ে login করা পুরাতন admin দের জন্য

**Modify: `login-with-pin`**
- যদি profile এর user_id `user_roles` এ admin role হিসেবে থাকে → reject with `admin_must_use_email`
- যদি user_id `shop_members` table এ থাকে (employee) → reject একইভাবে
- শুধু shop owner (admin/employee নয়) phone+PIN দিয়ে login করতে পারবে

## Frontend changes

### `src/pages/admin/Login.tsx`
- already email+password — কোনো বদল লাগবে না, just verify

### `src/pages/admin/PlatformAdmins.tsx` (পুরো rewrite)
- "Add admin" form: phone/PIN বদলে **email + password + full name + permissions checkboxes**
- Permissions checkboxes (Users, Marketplace, Marketplace Categories, Subscription Requests, Plans, Subscriptions)
- Table এ extra column: **Super** badge + permissions summary
- Super admin row এ Revoke button **disabled** + tooltip "Super admin — cannot be revoked"
- "Edit permissions" dialog প্রত্যেকের জন্য
- Current logged-in admin তার নিজের permissions edit করতে পারবে না (avoid lockout) — শুধু super admin অন্যদের edit করবে

### `src/pages/Index.tsx` / `src/components/site/LoginCard.tsx`
- phone+PIN login submit এর সময় edge function থেকে `admin_must_use_email` error এলে redirect to `/admin/login` সাথে toast: "Admin/employee হিসেবে email + password দিয়ে login করুন"

### নতুন: `src/pages/admin/MyCredentials.tsx` (route: `/admin/my-credentials`)
- যে admin phone+PIN দিয়ে এসেছিলেন (এখনো `admin_profiles.email` blank), login এর পর প্রথমবার এই page এ redirect
- email + password set করার form → `set-admin-credentials` call
- Sidebar এ "My Credentials" link

### `src/components/admin/AdminSidebar.tsx`
- প্রতিটা menu item render হবে `admin_profiles.permissions` দেখে — যা allow নেই, hide
- Super admin সব দেখবে

### Route guards
- `/admin/*` routes এ check করব — যে admin এর সেই page এর permission নেই, redirect to first allowed page বা "Access denied" page

## Files to be created/modified

**Migration (1)**: new `admin_profiles` table, RLS policies, `has_admin_perm()`, super admin protection trigger, seed existing admin as super.

**Edge functions**:
- create: `supabase/functions/create-admin-user/index.ts`
- create: `supabase/functions/set-admin-credentials/index.ts`
- modify: `supabase/functions/login-with-pin/index.ts` (block admins/employees)

**Frontend**:
- modify: `src/pages/admin/PlatformAdmins.tsx` (email/password + permissions + super protection)
- create: `src/pages/admin/MyCredentials.tsx`
- modify: `src/components/admin/AdminSidebar.tsx` (filter by permissions)
- modify: `src/lib/app-routes.tsx` (add MyCredentials route + permission guard wrapper)
- modify: `src/lib/auth.tsx` (load admin_profiles row, expose `adminPermissions` + `isSuperAdmin`)
- modify: `src/components/site/LoginCard.tsx` (handle `admin_must_use_email` error)

## Notes / acknowledgements

- পুরাতন phone+PIN admin (আপনি) এর existing auth user এর email এখন `8801XXXXXXXXX@tally.local` — `set-admin-credentials` সেটাকে real email এ replace করবে। এর পর phone+PIN দিয়ে login আর কাজ করবে না (intentional — admin email দিয়েই login করবে)।
- Employee = shop_members এর entry। তারাও email+password দিয়ে login করবে — owner তাদের create করার সময় phone+PIN এর পরিবর্তে email+password দেবে। (এই অংশ এই plan এর scope এ আছে — `create-employee-user` function পরে আরেকটা turn এ update করব, যেহেতু এই message মূলত admin team নিয়ে।)

আপনি approve করলে এগুলো implement করব।