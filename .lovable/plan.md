## সমস্যা ও সমাধান

তিনটা আলাদা সমস্যা আছে — প্রতিটার জন্য আলাদা ফিক্স।

### ১. Print-এ উপরে অনেক ফাঁকা জায়গা আসে

**কারণ:** Radix Dialog `position: fixed; top: 50%; transform: translate(-50%, -50%)` ব্যবহার করে। `body.invoice-printing #invoice-print-area`-কে `position: absolute; top: 0` দেওয়া হলেও, parent dialog container-এর transform এখনো লেআউটে effect করছে, এবং ব্রাউজারের default `@page` margin ও আছে।

**ফিক্স — `src/styles.css`-এর `@media print` ব্লক আপডেট:**
- `@page { margin: 8mm; size: auto; }` যোগ করা হবে যাতে browser-এর বড় default margin না আসে।
- Dialog overlay/portal-এর সব ancestor-কে `position: static !important; transform: none !important; padding: 0 !important; margin: 0 !important;` দিয়ে neutralize করা হবে।
- `#invoice-print-area`-কে `position: static` রাখা হবে (absolute দরকার নেই যখন বাকি সব hidden) এবং `padding-top: 0` নিশ্চিত করা হবে।
- `html, body { margin: 0 !important; padding: 0 !important; }` print-এ।

### ২. Print/Close করার পরে homepage-এ redirect হচ্ছে না

**কারণ:** `InvoiceDialog`-এর `onClose` শুধু `setInvoice(null)` করে — কোনো navigation নেই। তাই user transaction পেইজে আটকে থাকছে।

**ফিক্স — `src/components/app/POSPage.tsx`:**
- `<InvoiceDialog onClose={...} />` callback-এ dialog বন্ধ হওয়ার পর `nav({ to: "/app/dashboard" })` call হবে।
- ফলে cash/due যেকোনো sale বা purchase complete করার পর invoice দেখে close করলে সরাসরি dashboard-এ চলে যাবে।

### ৩. POS / থার্মাল রিসিট প্রিন্টের জন্য ছোট button

**নতুন ফিচার — `InvoiceDialog`-এ দুটো print button:**
- **বড় button** (আগের মতো): A4 full invoice print।
- **নতুন ছোট icon-only button** (পাশে): 80mm থার্মাল POS receipt print।

**Thermal receipt layout (compact):**
- Width: 80mm (`@page { size: 80mm auto; margin: 3mm; }` print mode-এর সময়)
- ছোট monospace-friendly font, single column
- শপের নাম + ঠিকানা + ফোন (centered, top)
- Invoice no + date
- Items: name × qty @ price = total (compact rows, no table borders)
- Subtotal / Discount / Delivery / **Total** (bold) / Paid / Due
- Footer: "ধন্যবাদ" / "Thank you"

**Implementation approach:**
- নতুন hidden div `#pos-print-area` যোগ হবে `InvoiceDialog`-এ যেটা শুধু print-এর সময় visible হবে।
- নতুন CSS class `body.pos-printing` যোগ হবে। যখন POS print হবে, সব hidden + শুধু `#pos-print-area` visible + `@page { size: 80mm auto }`।
- `posPrint()` function: `document.body.classList.add("pos-printing")` → `window.print()` → cleanup।
- ছোট button: `<Button size="icon" variant="outline">` + `Printer` icon (h-4 w-4)।

### টেকনিক্যাল সারাংশ

Files যা edit হবে:
- `src/styles.css` — `@media print` সেকশন আপডেট (whitespace fix + POS print mode যোগ)
- `src/components/app/InvoiceDialog.tsx` — POS receipt markup, ছোট button, `posPrint()` function
- `src/components/app/POSPage.tsx` — invoice dialog close-এ dashboard navigation

কোনো নতুন dependency দরকার নেই, কোনো DB migration নেই।
