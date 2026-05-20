# Phase B — LPG/পানি বোতল module পরবর্তী আপগ্রেড

আপনার ৪টা প্রশ্নের উত্তর + কাজের পরিকল্পনা।

## ১. LPG স্টক কোথায় add করবেন?

বর্তমানে `/app/lpg` → "নতুন এন্ট্রি" বোতাম থেকে ৬ ধরনের movement log করা যায়, যার মধ্যে **`purchase_full`** (ভর্তি কেনা) এবং **`refill_factory`** (কারখানা থেকে রিফিল) দিয়ে stock বাড়ে। কিন্তু UI-তে এটা পরিষ্কার না — তাই স্টক ট্যাব ফাঁকা মনে হচ্ছে।

পরিবর্তন:
- "স্টক" ট্যাবের উপরে দুটো বড় action button: **"ভর্তি বোতল ক্রয় / স্টক যোগ"** এবং **"কারখানা থেকে রিফিল"** — সরাসরি সঠিক movement type-এ dialog খুলবে।
- প্রত্যেক bottle-type কার্ডে inline `+` icon → ওই bottle-এর জন্য direct stock যোগ।
- Empty state-এ "প্রথম স্টক যোগ করুন" CTA।
- Movement dialog-এ Supplier/Vendor field add হবে (নিচের ৩ নং দেখুন)।

## ২. Dealer / পাইকারি / খুচরা tier

নতুন column `shops.lpg_tier text` — values: `dealer` / `wholesale` / `retail` (পানির বেলায় `producer` / `wholesale` / `retail`). ShopSettings-এ select।

প্রভাব:
- Bottle types-এ ৩টা আলাদা price column: `dealer_price`, `wholesale_price`, `retail_price` — sale dialog-এ customer-এর tier অনুযায়ী auto-fill।
- Marketplace-এ নিজের tier দেখাবে (নিচে ৪ নং)।
- Reports-এ tier-wise breakdown।

## ৩. ক্রয়ের হিসাব (Supplier / Company)

নতুন:
- `lpg_suppliers(shop_id, name, phone, address, type)` — `type ∈ {company, distributor, factory, local_filter}`। LPG-এর জন্য company বাধ্যতামূলক, পানির বেলায় optional (locally filter)।
- `bottle_movements`-এ নতুন column `supplier_id` (nullable, শুধু purchase_full / refill_factory-এর জন্য)।
- প্রত্যেক supplier-এর ledger page: কত ভর্তি/empty নিয়েছেন, কত টাকা বাকি, payment history।
- "কিনলেন কার কাছ থেকে" → supplier dropdown movement dialog-এ।
- "কাকে বিক্রি করলেন" → ইতিমধ্যে `contact_id` দিয়ে customer track হচ্ছে; customer ledger-এ "বোতলের হিসাব" section যোগ হবে।

## ৪. সিরিয়াল নম্বর + মেয়াদ (optional)

- নতুন table `bottle_units(shop_id, bottle_type_id, serial_no, status, current_holder_contact_id, expiry_date, last_qc_date)` — `status ∈ {full_shop, empty_shop, with_customer, retired}`।
- Bottle type-এ toggle `track_serial boolean` — যাদের serial track দরকার তারাই enable করবে। Default off (অনেকেই track করতে চান না)।
- Serial tracking on হলে movement dialog-এ qty-এর বদলে serial scanner/picker আসবে।
- Expiry date থাকলে dashboard-এ "মেয়াদ শেষের পথে" alert (LPG silinder-এর জন্য সাধারণত ১০ বছর)।

## ৫. LPG Marketplace (আলাদা)

বর্তমান marketplace-এর পাশাপাশি নতুন route: `/lpg` (public)।

- নতুন column `shops.list_in_lpg_marketplace boolean` — LPG/water shop owner Settings থেকে on/off।
- `/lpg` page-এ:
  - Visitor logged in হলে তার address/area দেখে নিকটতম LPG/water dealer auto-show।
  - Logged-out visitor হলে district/upazila filter + tier filter (dealer/wholesale/retail) + bottle brand filter।
  - প্রত্যেক shop card-এ: logo, name, area, tier badge, available bottle types + price, "যোগাযোগ" + "অর্ডার দিন" বোতাম।
- "অর্ডার দিন" → এক ক্লিকে existing ফর্দ/wishlist system reuse করবে, কিন্তু pre-filled "LPG রিফিল / নতুন বোতল" template-এ।
- নতুন edge function `lpg-marketplace-public` (or existing `marketplace-public`-এ action যোগ): area-based shop listing।
- Sitemap + SEO: এলাকা-ভিত্তিক landing page (যেমন `/lpg/dhaka/mirpur`)।

## ৬. পানির বোতল = LPG (memory note)

Memory-তে save করা হবে: "LPG এবং পানির বোতল business একই module (`lpg`) ব্যবহার করে। ৯৯% feature shared। পার্থক্য: LPG-তে supplier (company) বাধ্যতামূলক, পানিতে locally filter হয় তাই supplier optional। পরবর্তী যেকোনো LPG-related change automatically দুটোতেই apply হবে। আলাদা UI/route বানাবো না।"

## কাজের ক্রম

1. Memory save (LPG = water bottle rule)
2. Migration: `lpg_suppliers`, `bottle_units`, `shops.lpg_tier`, `shops.list_in_lpg_marketplace`, bottle_types-এ tier prices + `track_serial`, bottle_movements-এ `supplier_id`
3. Lpg.tsx UI: visible "স্টক যোগ" CTA + supplier dropdown + tier price + serial picker (conditional)
4. নতুন `/app/lpg/suppliers` page (vendor ledger)
5. নতুন `/lpg` public marketplace page + area filter + edge function
6. ShopSettings-এ tier + marketplace toggle
7. Customer profile-এ "বোতলের হিসাব" section
8. Dashboard widget — expiring bottles + supplier দেনা

## কী ছেড়ে দিচ্ছি (এখন না)

- Trip reconciliation deep page (পরে)
- Bottle aging multi-month report (পরে)
- WhatsApp auto-notification on refill due (পরে)
