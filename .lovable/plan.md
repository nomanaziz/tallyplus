## লক্ষ্য

নতুন দোকান তৈরি হলেই স্বয়ংক্রিয়ভাবে একটা unique `username` সেট হবে, যাতে অনলাইন শপের পাবলিক লিংক (`/vendor/{username}`) সাথে সাথে কাজ করে। পুরনো দোকানে কিছু করা হবে না — মালিক নিজেই Settings এ গিয়ে সেট করবেন।

## পরিবর্তন

### ১. DB trigger — `tg_shops_ensure_username` (migration)

`shops` টেবিলে `BEFORE INSERT` trigger যোগ হবে:

- যদি `NEW.username` already দেওয়া থাকে (non-empty), কিছুই করবে না।
- নাহলে দোকানের `name` থেকে slugify করবে: lowercase, only `a-z0-9-`, max 24 chars।
- যদি ফাঁকা/reserved/duplicate হয়, suffix যোগ করবে (`-ab12` → `extensions.gen_random_bytes` থেকে)।
- 10 attempt fail হলে fallback হিসেবে `shop-` + uuid prefix।
- Validation: `^[a-z0-9][a-z0-9_-]{2,31}$` মেনে চলবে, এবং Settings.tsx এর `RESERVED` সেটের সাথে মেলে এমন reserved শব্দ এড়াবে (app, admin, auth, shop, shops, api, vendor, marketplace ইত্যাদি)।
- `SET search_path = public, extensions` এবং `extensions.gen_random_bytes(...)` qualified call (আগের wishlist_slug trigger এর মতই)।

### ২. কোডে কোনো পরিবর্তন নেই

`AddShopDialog` এ আলাদা username field দরকার নেই — trigger সব handle করবে। User চাইলে পরে Settings থেকে edit করতে পারবেন।

## প্রভাব

- **নতুন দোকান**: তৈরির সাথে সাথেই `/vendor/{username}` লিংক কাজ করবে।
- **পুরনো দোকান**: untouched — মালিক Settings এ গিয়ে নিজে username দেবেন (যেমন এখন কাজ করে)।
- **online shop dashboard banner** এ "এখনো সেট করা হয়নি" শুধুমাত্র সেইসব পুরনো দোকানে দেখাবে যেগুলোয় username নেই।
