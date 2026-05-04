
## লক্ষ্য

মার্কেটপ্লেসের সার্ভিস অংশকে একটা পূর্ণ flow-এ রূপান্তর — কে সার্ভিস দিচ্ছে সেটা পরিষ্কার দেখা, ফোন/ম্যাসেজ/অর্ডার করার option, advance (যাতায়াত) charge সহ pre-booking, এবং consumer-এর "আমার সার্ভিস" history।

---

## 1. Service কার্ডে দোকানের নাম ও phone স্পষ্ট করা

বর্তমানে কার্ডে শুধু ছোট একটা shop chip আছে, ফোন নাম্বার নেই।

`MarketplaceServiceCard.tsx`-এ যোগ:
- দোকানের logo + নাম প্রমিনেন্ট
- দোকানের phone (থাকলে) — ছোট "📞 কল" chip যাতে কার্ড থেকেই সরাসরি tel: লিংক কাজ করে
- "অর্ডার / বুক করুন" বাটন (detail page-এ নিয়ে যায়)

---

## 2. Service Detail page (`/shop/service/$id`) refurbish

বর্তমান page-এ ফোন/WhatsApp আছে কিন্তু "বুক / অর্ডার" নেই।

নতুন ৩টা CTA পাশাপাশি:
1. **এখনই বুক করুন** (advance pay সহ form খোলে)
2. **ফোন করুন** (`tel:`)
3. **WhatsApp** (pre-filled message)

Shop info section বড় করা — logo, নাম, address, "দোকান দেখুন" লিংক।

---

## 3. Service-এ pre-booking + advance (যাতায়াত) charge

### DB migration (services table-এ নতুন column)
```sql
alter table public.services
  add column if not exists advance_amount numeric not null default 0,
  add column if not exists advance_required boolean not null default false,
  add column if not exists booking_enabled boolean not null default true;
```
- `advance_amount` — bKash/Nagad/cash-এ আগে দিতে হবে এই টাকা (যেমন ১০০৳ যাতায়াত)
- `advance_required` — true হলে advance ছাড়া বুকিং নেওয়া হবে না
- `booking_enabled` — provider চাইলে অনলাইন বুকিং বন্ধ রাখতে পারবে (শুধু ফোন)

### Service add/edit ফর্মে (`src/pages/app/Services.tsx`)
নতুন তিনটি field:
- "অনলাইন বুকিং চালু" toggle
- "Advance / যাতায়াত খরচ ৳" input
- "Advance বাধ্যতামূলক" toggle

---

## 4. Service Booking flow (নতুন)

### নতুন table: `service_bookings`
```sql
create table public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  consumer_user_id uuid,                 -- nullable (guest বুকিং allow)
  customer_name text not null,
  customer_phone text not null,
  customer_address text,
  division text, district text, upazila text, area text,
  scheduled_at timestamptz,              -- পছন্দের সময়
  note text,
  service_price numeric not null,
  advance_amount numeric not null default 0,
  advance_paid boolean not null default false,
  advance_payment_method text,           -- 'bkash' | 'nagad' | 'cash' | null
  advance_txn_id text,
  status text not null default 'pending',-- pending|confirmed|in_progress|completed|cancelled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
- RLS: shop owner/member তাদের shop-এর rows দেখতে/update করতে পারবে; consumer নিজের `consumer_user_id` rows পড়তে পারবে; `my_phones()`-এর সাথে phone ম্যাচ করলে guest-পরবর্তী claim।
- Trigger: `notify_shop_members` দিয়ে দোকানে নতুন বুকিং notification।

### নতুন component: `ServiceBookingDialog`
Detail page থেকে খোলে। Field:
- নাম, ফোন (consumer logged-in হলে auto-fill)
- ঠিকানা + Division/District/Thana picker (`BdLocationPicker`)
- পছন্দের তারিখ/সময় (`<input type="datetime-local">`)
- নোট (optional)
- যদি `advance_required=true` — advance pay step (bKash/Nagad number show করা — `payment_gateway_settings` থেকে; অথবা "ক্যাশ অন সার্ভিস" disable)
- "বুকিং নিশ্চিত করুন" বাটন → `service_bookings`-এ insert + toast "দোকান খুব শীঘ্রই কল করবে"

### Edge function update: `marketplace-public`
নতুন action `create-service-booking` (anon allowed, server-side validation: advance_required হলে advance fields না থাকলে reject)। RLS-friendly insert via service-role।

---

## 5. দোকানের জন্য Bookings page

নতুন route: `/app/services/bookings` (অথবা `Services.tsx`-এর ভিতরে "বুকিং" tab)।

দেখাবে: pending/confirmed/completed list — customer name, phone (call icon), address, scheduled time, advance status, এবং status update dropdown। ফোন করা মাত্র shop owner status="confirmed" করতে পারবে।

---

## 6. Consumer-এর "আমার সার্ভিস" history

নতুন page `/customer/my-services`:
- Logged-in consumer-এর সব `service_bookings` (`consumer_user_id = auth.uid()` OR `customer_phone IN my_phones()`)
- Status badge, service নাম, দোকানের নাম+লোগো, scheduled time, advance amount/status
- "আবার বুক করুন" বাটন (একই service-এ আবার dialog খুলে)

`CustomerLayout` sidebar/tab-এ "আমার সার্ভিস" link যোগ। Route registration `app-routes.tsx`-এ।

---

## 7. Edge function এক্সটেনশন

`marketplace-public/index.ts`:
- `create-service-booking` — anon + auth দুটোতেই কাজ করে; `consumer_user_id` auth context থাকলে সেট হয়
- `list-my-service-bookings` — auth required; consumer নিজের list পায়
- `service-detail` response-এ `advance_amount`, `advance_required`, `booking_enabled`, payment provider numbers (bKash/Nagad merchant) যোগ

---

## পরিবর্তন হবে এমন ফাইল

- DB migration: `services` columns + new `service_bookings` table + RLS + trigger
- `src/pages/app/Services.tsx` — booking/advance fields ফর্মে + "বুকিং" tab
- `src/components/marketplace/MarketplaceServiceCard.tsx` — phone chip + better shop info
- `src/pages/shop/service/Id.tsx` — ৩-CTA + ServiceBookingDialog
- `src/components/shop/ServiceBookingDialog.tsx` (new)
- `src/pages/customer/MyServices.tsx` (new) + `CustomerLayout` nav update
- `src/lib/app-routes.tsx` — `/customer/my-services`
- `supabase/functions/marketplace-public/index.ts` — নতুন actions

---

## Out of scope (এই step-এ নয়)

- Online payment gateway-এর সরাসরি bKash/Nagad API call — শুধু manual txn id collect করা হবে এখন; pure online auto-verification পরে।
