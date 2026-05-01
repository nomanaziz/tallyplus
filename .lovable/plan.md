## দুটো সমস্যা সমাধান

### সমস্যা ১ — Customer Dashboard-এ "আমার ফর্দ" ০ দেখায়, অথচ MyFordo পেজে ৩টা পর্দা আছে

**কারণ:** Dashboard সরাসরি `customer_wishlists` table-এ শুধু `consumer_user_id = user.id` দিয়ে count করছে। কিন্তু MyFordo পেজ `consumer-fordo-history` edge function ব্যবহার করে — যেটা phone number variants মিলিয়েও ফর্দ আনে (পাবলিক shop link দিয়ে পাঠানো ফর্দ user_id ছাড়াই save হয়, শুধু phone-এ মিলে)।

**সমাধান:**
- `src/pages/customer/Dashboard.tsx`-এ ফর্দ count আনার সময় MyFordo-র মতো একই `consumer-fordo-history` edge function call করব।
- Returned `wishlists` array-এর length-ই হবে actual count। এর সাথে `deleted_at` বাদ দিয়ে গণনা করব।

### সমস্যা ২ — গ্রাহক Division/District/Upazila/Area select করতে পারে না

**ভাল খবর — সব ডেটা/স্কিমা already আছে:**
- Super-admin DB তে `bd_divisions`, `bd_districts`, `bd_upazilas` table আছে এবং publicly readable (RLS: `SELECT true`)। Admin Locations পেজ থেকে seed করা যায়।
- `consumer_profiles` table-এ already `division`, `district`, `upazila`, `area` text column আছে। কোনো migration লাগবে না।

**সমাধান:**

1. **নতুন reusable component** `src/components/LocationPicker.tsx`:
   - তিনটা cascading dropdown: বিভাগ → জেলা → উপজেলা + একটা free-text "এলাকা/গ্রাম" input
   - শুধু `is_active=true` row গুলা দেখাবে
   - Bengali (`name_bn`) by default
   - Data caching: React Query দিয়ে — divisions/districts/upazilas list একবার load হয়ে cache হবে (5 min stale time)
   - Props: `value: { division, district, upazila, area }`, `onChange`, optional `disabled`

2. **`src/pages/customer/Profile.tsx`-এ যোগ:**
   - Form state-এ division/district/upazila/area add
   - Profile load করার সময় এই ৪টা field সহ select করব
   - Save করার সময় upsert payload-এ পাঠাবো
   - "ঠিকানা" Textarea-র উপরে LocationPicker বসব

3. **Future-proof reuse:**
   - Same `LocationPicker` component পরে product listing form, shop registration ইত্যাদিতে use করা যাবে — single source of truth (super-admin database)

## Files to change

- `src/pages/customer/Dashboard.tsx` — fordo count edge function থেকে আনব
- `src/components/LocationPicker.tsx` (নতুন) — cascading bn_div/dist/upa picker
- `src/pages/customer/Profile.tsx` — LocationPicker integrate, save/load logic update

## Out of scope (এই round-এ নয়)

- নতুন database migration — সব কিছু আগে থেকেই আছে
- Map-based picker
- Geo-based shop suggestion (আলাদা feature)
- Vendor/Shop registration-এ একই picker — পরে চাইলে যোগ করা যাবে
