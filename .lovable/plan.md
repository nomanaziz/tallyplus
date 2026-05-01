## লক্ষ্য

গ্রাহকের ফর্দ পেইজে তিনটা feature:
1. **Save** — ফর্দ template হিসেবে সংরক্ষণ (যেখানে নেই)
2. **Duplicate** — পুরোনো ফর্দ থেকে hubohu নতুন ফর্দ বানানো, edit করে নিজের তালিকায় রাখা
3. **Month filter** — কোন মাসে কয়টা ফর্দ পাঠানো হয়েছে, মাস ধরে filter

দুইটা পেইজ আছে — দুইটাতেই কাজ করতে হবে:
- `/customer/my-fordo` (login করা গ্রাহকের নিজের সব দোকানের ফর্দ)
- `/f/:slug/my` (একটা দোকানের public link এ PIN দিয়ে ঢোকা গ্রাহকের ফর্দ)

---

## বর্তমান অবস্থা (যা ইতিমধ্যে আছে)

- **`/customer/my-fordo`**: টেমপ্লেট save আছে (CreateFordo পেইজে), template থেকে নতুন ফর্দ load হয়। কিন্তু পাঠানো ফর্দ থেকে সরাসরি "save as template" বা "duplicate" নাই। মাস filter নাই।
- **`/f/:slug/my`**: "এই ফর্দ আবার পাঠান" button আছে (reuseWishlist) — এটাই duplicate এর কাছাকাছি, কিন্তু "save as template" নাই (templates শুধু shopkeeper বানায়)। মাস filter নাই।

DB tables ঠিক আছে: `consumer_fordo_templates` (auth user এর জন্য), `wishlist_templates` (shop-link customer এর জন্য) — দুইটাই jsonb items সহ।

---

## কী বানাবো

### A. `/customer/my-fordo` (auth গ্রাহক)

**1. মাস filter bar** — পাঠানো ফর্দ section এর উপরে:
- চলতি মাস default
- dropdown / chips: গত ১২ মাস + "সব মাস"
- প্রতি option এ count badge: `নভেম্বর ২০২৫ (৫)`
- filter অনুযায়ী wishlists list filter হবে; খালি হলে "এই মাসে কোনো ফর্দ নেই"

**2. প্রতি wishlist card এ দুইটা নতুন button** (expand-এর মধ্যে):
- **"টেমপ্লেট হিসেবে সংরক্ষণ"** → ছোট dialog এ template name নিয়ে `consumer_fordo_templates` এ insert (items + note copy)
- **"আবার পাঠান (duplicate)"** → এই wishlist এর items + note নিয়ে `/customer/create-fordo` এ navigate, prefill (sessionStorage এ পাঠাবো)

**3. CreateFordo page** এ sessionStorage থেকে prefill support যোগ (templateId এর মতো `?duplicateFrom=<wishlistId>` flow)

### B. `/f/:slug/my` (public shop link)

**1. মাস filter bar** — wishlists section এর উপরে, একই pattern (এই দোকানের পাঠানো ফর্দ গুলো মাস ধরে)

**2. Save as template button** — প্রতি wishlist card এর expanded view এ:
- নতুন edge function `save-wishlist-template` ইতিমধ্যে আছে (already saw the file)
- token + name + items পাঠাবো, dialog দিয়ে name নেবো

**3. Duplicate** — `reuseWishlist` ইতিমধ্যে আছে কিন্তু button label কে স্পষ্ট করবো: "নতুন করে পাঠান (এই ফর্দের নকল)"। কাজ একই থাকবে।

---

## Technical details

- **Month grouping**: client-side। `wishlists.created_at` থেকে `YYYY-MM` key বের করে `Map<string, count>` বানাবো, options sorted desc।
- **Bengali month names**: `["জানুয়ারি",...,"ডিসেম্বর"]` array, year সহ display।
- **Duplicate flow (auth side)**: 
  ```
  sessionStorage.setItem(`fordo-dup-${wlId}`, JSON.stringify({ items, note }));
  navigate to /customer/create-fordo?duplicateFrom=<wlId>
  ```
  CreateFordo এ existing `templateId` useEffect এর মতো নতুন `duplicateFrom` useEffect।
- **Save template (auth side)**: `supabase.from("consumer_fordo_templates").insert({ consumer_user_id, name, items, note })`
- **Save template (public side)**: existing `save-wishlist-template` edge function কল।
- কোন DB migration লাগবে না — সব tables already আছে।

---

## ফাইল পরিবর্তন

```text
src/pages/customer/MyFordo.tsx         — month filter + 2 buttons per card + small dialog
src/pages/customer/CreateFordo.tsx     — duplicateFrom prefill support
src/pages/f/slug/My.tsx                — month filter + save-as-template dialog + button label
```

কোনো নতুন ফাইল বা edge function নাই (সব ইতিমধ্যে আছে)।
