## Goal
দোকানের সেটিংস পেজে ঠিকানার পাশে বিভাগ → জেলা → উপজেলা/থানা → এলাকা নির্বাচনের option যোগ করা।

## What exists
- `LocationPicker` component (`src/components/LocationPicker.tsx`) ইতিমধ্যে cascading Division → District → Upazila + Area দেয়, super-admin এর `bd_*` table থেকে।
- DB তে `seller_locations` table আছে (one-to-one with `shops`) — columns: `shop_id, division, district, upazila, area, lat, lng`. এটাই source of truth হিসেবে ব্যবহার করব, নতুন কোনো column বা migration দরকার নেই।

## Changes

**`src/pages/app/ShopSettings.tsx`**
- Import `LocationPicker` ও `LocationValue`।
- নতুন state: `location: LocationValue` (`{ division, district, upazila, area }`)।
- Mount এ `current.id` থাকলে `seller_locations` থেকে row fetch করে state ভর্তি করব।
- "দোকানের তথ্য" card-এর Address textarea-র নিচে নতুন subsection "এলাকা / Location" যেখানে `<LocationPicker value={location} onChange={setLocation} disabled={!isOwner} />` রেন্ডার হবে।
- `save()` ফাংশনে shop update-এর পরে `seller_locations` upsert (on conflict `shop_id`) করব division/district/upazila/area সহ। চারটাই `null` হলে row রাখা যাবে — কোনো ক্ষতি নেই।
- Address textarea (existing free-text) যেমন আছে তেমন রাখব — হাতে লেখার জন্য house/road ইত্যাদি।

## Out of scope
- Address textarea রিমুভ বা rename করা হবে না।
- Customers/suppliers এর location picker — শুধু shop settings।

## Technical notes
- `seller_locations` row না থাকলে fetch fallback empty state দেবে; save এ upsert তৈরি করবে।
- bn UI label: "এলাকা / অবস্থান (ঐচ্ছিক)" এর নিচে picker।
