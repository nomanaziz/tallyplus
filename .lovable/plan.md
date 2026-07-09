# Shop-Module রোলআউট প্ল্যান

আপনার priority অনুযায়ী চারটা ধাপে কাজ করব। প্রতিটা ধাপ আলাদা turn-এ ship করব যাতে test করতে পারেন। কোনো existing feature ভাঙবে না — শুধু নতুন যোগ + focus বাড়ানো।

## ধাপ ১ — "My Modules" দেখার পেজ (আগে)

আপনার shop-এ কোন module active সেটা এক জায়গায় দেখা + on/off করার জন্য।

- **Route:** `/app/shop-settings/modules` (Shop Settings-এর ভেতরে নতুন tab "আমার মডিউল")
- Shop type-এ যেসব module *recommended* সেগুলো badge দিয়ে দেখাব ("এই দোকানের জন্য সুপারিশ")
- প্রতিটা module card-এ: নাম, ব্যাখ্যা, on/off switch, "কোথায় ব্যবহার হয়" hint
- Dashboard-এর উপরে ছোট "আপনার active মডিউল: ৭টা →" chip, click করলে এই পেজে যাবে
- **Header/topbar-এ shop name-এর পাশে ছোট badge** — shop type-এর icon + নাম, hover/tap-এ active modules list

## ধাপ ২ — Service-focused module (salon/AC/filter/beauty)

Service-only দোকানের জন্য UI service-first, product পরে।

- POS-এ shop type service হলে **default tab = Services**, product tab শুধু ছোট link
- Service card-এ home-service badge, duration, warranty, advance
- Quick Service button আরো prominent (already আছে) + service categories preset seed (Haircut, Manicure, Facial, AC servicing, RO filter cleaning, ইত্যাদি shop-type অনুযায়ী)
- Service report-এ additional cost/parts আলাদা কলাম
- Dashboard shortcut section reorder: service shop হলে Services আগে, Products পরে

## ধাপ ৩ — Flexi-load / Recharge module

আপনি সবগুলো field চেয়েছেন (card stock + customer/due + operator/commission)। একটাই নতুন module `flexiload`।

- **Table:** `flexiload_entries` (operator, msisdn, amount, commission, customer_id nullable, is_due, note, date)
- **Card stock table:** `recharge_cards` (denomination — 5MB/10MB/20MB ইত্যাদি free-form, quantity, cost, sell_price)
- **Page:** `/app/flexi-load` — উপরে quick entry form (Operator: bKash/Nagad/Rocket/Airtel/GP/Robi/BL/Teletalk + amount + commission + optional customer), নিচে আজকের entry list + দিন/মাসের total commission
- Card stock tab — card যোগ, বিক্রি হলে stock কমে, লাভ auto other-income-এ
- Due হলে customer ledger-এ যাবে
- Cashbox-এ commission auto other-income; recharge amount নিজে cash হাত বদল হয় বলে balance-neutral

## ধাপ ৪ — LPG / Water bottle flow polish

Existing lpg module রেখে UX simple করব — নতুন column/table বানানো ছাড়া।

- Customer-এর প্রথম bottle sale-এ dialog: "এটা প্রথম বোতল? জামানত (deposit) নিচ্ছেন?" — yes হলে deposit + bottle একসাথে record
- Refill flow-এ শুধু empty return + full deliver step, দাম শুধু gas-এর
- Holdings screen-এ "কার কাছে কয়টা বোতল" আরো পরিষ্কার
- Water shop-এ supplier optional (existing memory অনুযায়ী)

## Technical notes (dev-only)

- Migration: নতুন module code `flexiload` + `recharge_cards`/`flexiload_entries` টেবিল RLS + GRANT সহ
- `MODULES` map-এ `flexiload` যোগ, `MODULE_LABELS`-এ bn/en label
- `shop_types.default_modules` (যদি না থাকে column যোগ) দিয়ে shop type → recommended modules mapping; নাহলে static map `SHOP_TYPE_MODULE_MAP` in `src/lib/modules.ts`
- Sidebar/Dashboard-এ shop-type-priority ordering helper
- সব change existing `useEnabledModules` gate-এর ভেতরেই থাকবে, তাই অন্য shop টাইপের user-এর কিছু বদলাবে না

## এখন আপনি কী বলবেন

সবগুলো ধাপ approve করলে **ধাপ ১ থেকে শুরু করব**। কোনো ধাপে extra field/behavior লাগলে এখনই বলে দিন — না হলে উপরের spec অনুযায়ী চালাব।