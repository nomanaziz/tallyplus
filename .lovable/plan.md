## POS পেজে ৪টি fix

### ১) Product card-এ `+` button আবার ঠিকমতো দেখানো
ফাইল: `src/components/app/POSPage.tsx` (line 576-581)

সমস্যা: `<button>` element-এ কোনো `className` নেই — তাই card-এর border/bg/padding নেই, `relative` wrapper-ও নেই। ফলে `absolute` positioned `+` button আর qty badge ভুল জায়গায় বসছে বা parent card-এর বাইরে যাচ্ছে।

ঠিক করা:
- Button-এ পুরো card styling ফিরিয়ে আনব: `group relative flex flex-col rounded-xl border bg-card p-2 pt-2 shadow-sm transition hover:border-primary/40 hover:shadow-md disabled:opacity-50`
- `+` button card-এর top-right corner-এ স্পষ্ট দেখাবে (`absolute right-1.5 top-1.5`, `h-7 w-7`, primary bg, ring) — এখন যেমন আছে সেটাই, শুধু parent ঠিক হলে দেখা যাবে।
- qty badge top-left-এ (এখনকার মতই)।

### ২) Cart panel-এ ক্যাশ + বাকি আগের মতো পাশাপাশি
ফাইল: `src/components/app/POSPage.tsx` (line 852-888)

সমস্যা: এখন তিনটা button (ক্যাশ, বাকি, হোল্ড) উপর-নিচ stacked — জায়গা নষ্ট হচ্ছে।

ঠিক করা:
- `flex flex-col gap-2` → `grid grid-cols-2 gap-2`
- ক্যাশ (F1) আর বাকি (F2) **পাশাপাশি**, দুটোই `h-12` size।
- **হোল্ড button সম্পূর্ণ সরিয়ে দেব** (user বলেছে hold না থাকলেও চলবে)। F2 shortcut বাকি-তে assign হবে।

### ৩) Cart item card compact করা — unit dropdown সরানো
ফাইল: `src/components/app/POSPage.tsx` (line 731-744)

সমস্যা: প্রতিটা cart item-এ আলাদা unit dropdown (Piece/Packet/Bottle...) অনেক জায়গা নিচ্ছে। Product-এর নিজস্ব unit তো product entry-তেই আছে।

ঠিক করা:
- Unit dropdown পুরো **সরিয়ে দেব**।
- পরিবর্তে item name-এর পাশে ছোট label হিসেবে product-এর unit দেখাব (যেমন: "৫০০ গ্রাম চাল · piece") — একদম minimal text, কোনো input নেই।

### ৪) Unit Price + Discount input compact
ফাইল: `src/components/app/POSPage.tsx` (line 746-769)

সমস্যা: দুটো input field অনেক বড় (`h-8` + label + suffix padding), discount-এ একশোর বেশি হবে না তবু চওড়া।

ঠিক করা:
- Two-column grid রাখব কিন্তু height `h-7`, text `text-[11px]`।
- Unit Price label "মূল্য" / "Price", suffix `৳` ছোট করব (pr-6)।
- Discount input narrower — suffix `%` ছোট, max width কম। Inline single-row layout: label বাঁদিকে, input ডানদিকে (label উপরে আর নয়)।
- Result: cart card-এর vertical space প্রায় ৩০% কমবে।

### ৫) Quick add buttons (+1, +2, +5) compact
ফাইল: `src/components/app/POSPage.tsx` (line 771-799)

- `+1 +2 +5` buttons আর qty stepper আর line total — তিনটাই একই row-এ আছে এখন, ঠিকই আছে।
- শুধু buttons-এর padding `px-1.5 py-0.5` → `px-1 py-0.5`, text smaller করে আরও tight করব।

### যা পরিবর্তন হবে না
- Discount calculation logic, payment flow, F1/F2 shortcut behavior (F2 শুধু hold থেকে due-তে যাবে)
- Sidebar, menu, routing, backend, i18n strings (Bangla "ক্যাশ"/"বাকি" আগের মতই)
- Product grid layout, search/shortcut bar, top stat strip

### Files
- `src/components/app/POSPage.tsx` — উপরের ৫টা change
