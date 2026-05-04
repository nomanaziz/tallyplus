# ফর্দ Share Link (পাবলিক, রিড-অনলি)

গ্রাহক একটা ফর্দ তৈরি করার পর একটা public link পাবে যা WhatsApp/SMS-এ যেকাউকে পাঠানো যাবে। যিনি link পাবেন, তিনি login ছাড়াই ফর্দ দেখতে ও print করতে পারবেন — edit/modify করতে পারবেন না। দোকানদারের সঙ্গে existing flow (যে ফর্দ দোকানে পাঠানো হয়) আগের মতই থাকবে — এটা তার সাথে collide করবে না।

## কী করা হবে

1. **ডাটাবেজ migration**
   - `customer_wishlists`-এ যোগ করা হবে: `share_token text unique` (auto-generated, ~16 char), `share_enabled boolean default true`।
   - সব existing rows-এ token backfill।
   - একটি SECURITY DEFINER RPC `get_shared_fordo(_token text)` — token মিললে wishlist + items + shop name JSON ফেরত দেবে। token না জানলে কিছুই access করা যাবে না (RLS অপরিবর্তিত)।
   - Anon + authenticated কে শুধু এই function-এ EXECUTE permission।

2. **Public পেজ**
   - নতুন route: `/f/s/:token` (lazy loaded, কোনো auth লাগবে না)।
   - Page-এ দেখাবে: গ্রাহকের নাম, দোকান (যদি থাকে), note, সব item (নাম/পরিমাণ/একক/দাম), মোট টাকা।
   - "Print" বোতাম (`window.print()`) — print-friendly CSS (header/footer hidden when printing)।
   - Edit/delete UI কিছুই থাকবে না — pure read-only।
   - Token invalid বা `share_enabled=false` হলে friendly "এই link আর কাজ করছে না" message।

3. **Share বোতাম যোগ করা হবে**
   - `MyFordo.tsx` — প্রতিটি ফর্দ row-তে একটা **Share** আইকন: click করলে Web Share API (mobile) বা clipboard copy + toast ("লিংক কপি হয়েছে")। সাথে WhatsApp share quick action।
   - `CreateFordo` save success-এর পর একটা dialog/toast: "ফর্দ তৈরি হয়েছে — লিংক কপি করুন / WhatsApp-এ পাঠান"।

4. **Owner flow অপরিবর্তিত** — existing `customer_wishlists` insert/RLS/notification trigger কিচ্ছু বদলাবে না। শুধু extra columns যোগ হচ্ছে।

## Technical notes

- Token format: `encode(gen_random_bytes(12), 'base64')` থেকে url-safe 16 char।
- RPC return shape:
  ```
  { wishlist: {...}, items: [...], shop: { id, name, logo_url } | null }
  ```
- Share URL: `${window.location.origin}/f/s/${token}`
- WhatsApp: `https://wa.me/?text=${encodeURIComponent('আমার ফর্দ: ' + url)}`
- Print CSS scoped via a `print:` Tailwind utilities + `@media print` block in the page.

## Files

- New migration (add columns + RPC + grant)
- New page: `src/pages/f/Share.tsx`
- Route registration: `src/lib/app-routes.tsx` (add `f/s/:token`)
- Edit: `src/pages/customer/MyFordo.tsx` (Share button per row)
- Edit: `src/pages/customer/CreateFordo.tsx` (post-save share dialog)
- Small helper: `src/lib/share-fordo.ts` (build URL, copy/share helpers)
