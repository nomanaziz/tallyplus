## সমস্যা
আপলোড করা Excel এ আছে: **8 Division, 64 District, 622 Thana/Upazila** (city corporation এর থানা সহ — যেমন Dhaka এর 57টি, Chattogram এর 32টি)।

বর্তমান database ও admin portal এ আছে:
- ✅ 8 Divisions (সব আছে, কিন্তু Chattogram → "Chattagram" — typo)
- ✅ 64 Districts (সব আছে)
- ❌ মাত্র **494 Upazilas** — **128টি থানা missing** (মূলত Dhaka, Chattogram, Khulna, Sylhet, Rajshahi, Barisal এর city corporation এর থানা)

## সমাধান

### 1. নতুন complete BD geo JSON তৈরি (`src/data/bd_geo.json`)
Excel ফাইল থেকে data process করে নতুন JSON বানাব:
- 8 Division (সঠিক বানান: Chattogram, Coxsbazar ইত্যাদি)
- 64 District (English + Bengali দুটোই)
- 622 Thana/Upazila (English + Bengali দুটোই, district এর সাথে link)

প্রতিটি record এ stable `legacy_id` থাকবে যাতে re-sync করলেও duplicate না হয়।

### 2. Division name fix migration
বর্তমান DB তে "Chattagram" আছে — Excel এ "Chattogram"। JSON re-seed করলে নতুন legacy_id দিয়ে ঢুকবে। তাই migration দিয়ে পুরাতন "Chattagram" entry টা update করব → "Chattogram", যাতে existing references ভেঙে না যায়।

### 3. Admin Locations page উন্নত করা (`src/pages/admin/Locations.tsx`)
- উপরে summary tiles: "মোট Division: X / 8", "জেলা: Y / 64", "থানা/উপজেলা: Z / 622" — কোথায় missing তা সাথে সাথে দেখা যাবে
- Search box: division/district/thana নাম দিয়ে instant filter
- "Re-sync from JSON" button আগের মতই থাকবে — চাপলে missing 128 thana auto add হবে

### 4. seed-bd-geo edge function
আগে থেকেই upsert (onConflict: legacy_id) করে — তাই কোনো পরিবর্তন লাগবে না। শুধু JSON বড় হবে, batch chunking আগে থেকেই আছে।

### 5. কাজের পর Admin কে যা করতে হবে
Admin → Locations page এ গিয়ে **"Re-sync from JSON"** বোতাম এ একবার চাপতে হবে। তাহলে missing 128 thana database এ যোগ হবে।

## Technical breakdown

**Files to create/modify:**
- `src/data/bd_geo.json` — Excel থেকে generate করা নতুন complete data (overwrite)
- `src/pages/admin/Locations.tsx` — summary tiles + search যোগ
- `supabase/migrations/<timestamp>_fix_chattogram.sql` — পুরাতন division row এর `name_en` update

**Generation script (one-time, exec only):**
Python দিয়ে Excel parse → district lookup table দিয়ে correct `district_legacy_id` map → output JSON।

**District name mapping notes:**
Excel এ "Cox's Bazar" আছে, DB তে "Coxsbazar" — script এ normalize করা হবে যাতে existing district legacy_id এর সাথে match করে এবং duplicate না হয়।

**Result:**
Re-sync এর পর: Admin Portal → Locations এ পাবেন:
- 8 Division (সব সঠিক বানান)
- 64 District (সব আছে)
- 622 Thana/Upazila (সব City Corp এর থানা সহ — Dhaka 57, Chattogram 32, Sylhet 18, Rajshahi 21, Barisal 17, Khulna 17, Comilla 18 ইত্যাদি)
- প্রতিটি বাংলা ও English দুই নামে।
