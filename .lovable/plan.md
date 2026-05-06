## লক্ষ্য

Admin portal-এ যেকোনো registered user-কে এক ক্লিকে একটি subscription "gift" করা যাবে — সাথে ঐ user কতগুলো দোকান বানাতে পারবে সেটাও admin override করতে পারবে (limited / unlimited / lifetime)।

---

## কী add হবে — Admin UX

`/admin/users` page-এর প্রতিটি row-তে নতুন **"Grant Access"** button (Gift icon)। ক্লিক করলে একটা dialog খুলবে:

```text
┌─ Grant Access — <user name / phone> ─────────────┐
│  Plan:     [ Pro / Premium / Lifetime ▼ ]        │
│  Duration: ( ) Use plan default (e.g. 30 days)   │
│            ( ) Custom: [ 90 ] days               │
│            ( ) Lifetime (10 years)               │
│  Shops allowed:                                  │
│            ( ) Use plan limit                    │
│            ( ) Custom: [ 5 ]                     │
│            ( ) Unlimited                         │
│  Note (optional): [_________________]            │
│                                                  │
│   [ Cancel ]                 [ Grant Access ]    │
└──────────────────────────────────────────────────┘
```

User row-তে শো হবে: এখন কোন plan active, কবে expire, override shop limit থাকলে সেটা।

আরেকটা **"Revoke"** option থাকবে যা active subscription cancel করে এবং shop-limit override clear করে।

---

## Database changes

1. `profiles` table-এ নতুন nullable column:
   - `shop_limit_override int` — admin set করলে এটাই কার্যকর হবে। `NULL` মানে plan-এর default।
   - `unlimited_shops boolean default false` — true হলে কোনো cap নেই।

2. `user_shop_limit(_user_id)` function update — override থাকলে সেটাই, `unlimited_shops` true হলে অনেক বড় সংখ্যা (e.g. 9999) return।

3. নতুন admin-only RPC `admin_grant_access(_user_id, _plan_id, _duration_days, _shop_limit, _unlimited_shops)`:
   - `is_admin(auth.uid())` check
   - existing active subscription expire করে নতুনটা insert (status=`active`)
   - `profiles.shop_limit_override` / `unlimited_shops` update
   - audit row notify_admins

4. `admin_revoke_access(_user_id)` RPC — active subscription expire + overrides clear।

5. একটা "Lifetime" plan seed (যদি না থাকে) — `code='lifetime'`, duration_days=3650, max_shops=9999, price_bdt=0, is_active=false (যাতে public Pricing-এ না দেখায়, শুধু admin-grant এর জন্য)।

---

## Frontend changes

**নতুন file:** `src/components/admin/GrantAccessDialog.tsx` — Dialog with plan select, duration mode, shop-limit mode, calls RPC, toasts।

**Edit:** `src/pages/admin/Users.tsx`
- Load করার সময় active subscription + plan + `shop_limit_override`/`unlimited_shops` query
- প্রতিটি row-তে "Plan/Expires" column যোগ
- Actions-এ "Grant" + (active থাকলে) "Revoke" buttons

কোনো client-side bypass নয় — সব validation RPC-তে server-side।

---

## Out of scope

- Bulk grant (একসাথে অনেক user)
- Plan তৈরির flow বদল (Plans page অপরিবর্তিত)
- Customer (consumer) গ্রাহকদের জন্য আলাদা grant — শুধু shop owner profiles
