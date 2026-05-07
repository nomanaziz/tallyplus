## Goal

Employee যেই shop-এর জন্য permission দেওয়া হয়েছে শুধু সেই shop-ই তার কাছে দেখাবে এবং সে অন্য কোনো shop-এ switch বা ঢুকতে পারবে না। Owner চাইলে এক click-এ "আমার সব দোকান"-এর access-ও দিতে পারবেন — তখন future নতুন দোকানেও সেই employee auto-যুক্ত হবে।

## Database

`shop_members`-এ একটি নতুন column যোগ:

- `is_all_shops boolean NOT NULL DEFAULT false` — এই row "সব দোকান" mode-এ create হয়েছিল কিনা চিহ্ন।

পুরোনো কোনো logic বা column বদলানো হবে না। Existing single-shop entries by default `false` থাকবে।

### Trigger: auto-add to new shops

`AFTER INSERT ON public.shops` trigger function:

- New shop-এর `owner_id`-এর অন্য কোনো shop-এ যেসব user-এর `is_all_shops = true` row আছে, তাদের জন্য নতুন shop-এ একই `role`, `permissions`, `custom_role_id`, `full_name`, `email`, `address`, `avatar_url`, `is_all_shops = true` সহ row insert করবে (`ON CONFLICT (shop_id, user_id) DO NOTHING`).

ফলে owner নতুন দোকান বানালে "all-shops" employees auto-পেয়ে যাবে।

## Backend (NewUserAccessDialog)

`src/components/app/NewUserAccessDialog.tsx`-এর Step 2 form-এ একটি নতুন toggle যোগ:

```
( ) শুধু এই দোকানের জন্য (default)
( ) আমার সব দোকানের জন্য
```

`save()` flow আপডেট:

1. আগের মতো `create-employee-user` call করে `userId` পাওয়া।
2. **Single shop** হলে আগের মতো শুধু `current.id`-তে upsert (`is_all_shops: false`)।
3. **All shops** হলে: owner-এর সব active shop fetch (`shops where owner_id = auth.uid() and deleted_at is null`), প্রতিটিতে একই role/permissions দিয়ে upsert (`is_all_shops: true`)।

এই dialog already current shop scope-এ insert করে — তাই default behavior অপরিবর্তিত।

## Frontend visibility / UX

বর্তমানে `shops` RLS policy ইতিমধ্যেই employee-কে শুধু member shops দেখায়। Bug-প্রবণ UX hide করা হবে যাতে employee ভুলেও multi-shop UI না দেখে:

1. **`src/components/app/AppTopbar.tsx`** — "দোকান পরিবর্তন / Switch Shop" menu item hide করা যখন:
   - `shops.length <= 1`, অথবা
   - current user shop owner নয় (i.e., `current.owner_id !== user.id`).
2. **`src/pages/app/Shops.tsx`** — non-owner হলে "Add shop", "Delete", "Transfer" action buttons hide। শুধু accessible shop-গুলো list দেখাবে।
3. **`src/pages/app/AppLayout.tsx`** (যদি initial redirect single-shop ধরে থাকে) — কোনো পরিবর্তন না; `useShop` already first accessible shop select করে।

`__owner__` permission gating ইতিমধ্যেই sidebar-এ Recycle Bin / Access ইত্যাদি hide করছে — সেটা যেমন আছে তেমনি থাকবে।

## Files Changed

- New migration: `shop_members.is_all_shops` column + `tg_shops_propagate_all_shops_members` trigger function + trigger।
- `src/components/app/NewUserAccessDialog.tsx` — scope toggle UI + multi-shop insert path।
- `src/components/app/AppTopbar.tsx` — conditional "Switch Shop" menu item।
- `src/pages/app/Shops.tsx` — owner-only action buttons।

## Verification

1. Owner A (2 shops: X, Y), employee E-কে শুধু X-এর permission দিলে → E login করলে শুধু X দেখাবে, Switch Shop menu আসবে না।
2. Owner A, employee F-কে "সব দোকান" দিলে → F login করলে X ও Y দুটোই দেখাবে, Switch Shop চলবে।
3. Owner A নতুন shop Z create করলে → F-এর X ও Y এর `is_all_shops=true` rows-এর সাথে Z-তেও auto row তৈরি হবে; E-এর কোনো শাখায় Z যোগ হবে না।
4. Employee Z থেকে settings/transfer/delete option দেখতে পাবে না।