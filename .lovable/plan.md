## কী যোগ হবে

Product **add** (`Products.tsx`), **sell** এবং **purchase** (`POSPage.tsx`) — তিন জায়গাতেই barcode scan support। দুই ধরনের scanner:

1. **Camera scanner** — phone/laptop-এর camera দিয়ে barcode/QR scan
2. **Hardware scanner** — USB barcode gun (কীবোর্ডের মতো type করে + Enter দেয়) — এটার জন্য আলাদা কোনো setup লাগে না, শুধু input field-এ auto-focus + Enter handle করলেই হবে

## ১. Reusable component: `BarcodeScannerButton`

`src/components/app/BarcodeScannerButton.tsx`

- ছোট button (icon)। ক্লিক করলে dialog খোলে দুটো tab নিয়ে:
  - **📷 Camera** tab — live camera feed, একবার barcode পেলে auto-detect করে `onDetected(code)` call করে dialog বন্ধ হয়
  - **⌨️ Hardware** tab — একটা auto-focused input field, scanner gun-এর Enter এ trigger হয়
- **Library**: `@zxing/browser` (lightweight, EAN/UPC/Code128/QR সবই support করে, pure JS, Worker-compatible না হলেও client-only বলে সমস্যা নেই)
- Camera permission না থাকলে clear error message + Hardware tab-এ fallback suggestion
- Beep sound on successful scan
- Mobile-friendly: rear camera default, torch toggle if available

## ২. POSPage এ integration (Sell + Purchase)

বর্তমানে লাইন 222-224 এ একটা placeholder ScanLine button আছে যেটা কিছু করে না। সেটাকে `BarcodeScannerButton` দিয়ে replace করা হবে।

Scan flow:
- Code পেলে → products list-এ `barcode` field ম্যাচ খুঁজবে
- ম্যাচ পেলে → সরাসরি `addToCart(p)` call (serialized হলে SerialPickDialog খুলবে — current behavior)
- ম্যাচ না পেলে → toast "এই barcode-এর পণ্য পাওয়া যায়নি" + scanned code টা search box এ বসিয়ে দিবে যাতে user manually যোগ করতে পারে

এছাড়া search input-এ **global hardware scanner listener** — page যখন POS-এ আছে, hardware gun যেকোনো জায়গায় type করলেও কাজ করবে (rapid keystroke detection: <50ms gap + Enter)।

## ৩. Products page এ integration

`Products.tsx` — barcode toggle on করলে input field-এর পাশে scan button দেখাবে। স্ক্যান করলে input-এ value বসে যাবে।

## ৪. Files

- নতুন: `src/components/app/BarcodeScannerButton.tsx`
- নতুন: `src/hooks/useHardwareScanner.ts` (rapid-keystroke + Enter detection)
- Edit: `src/components/app/POSPage.tsx` (button replace + scan handler + global listener)
- Edit: `src/pages/app/Products.tsx` (barcode field-এর পাশে scan button)
- Dependency: `bun add @zxing/browser @zxing/library`

## ৫. UX details

- Camera dialog খোলার সময় explicit permission prompt
- iOS Safari এ camera access HTTPS-only — preview/published দুটোই HTTPS, OK
- Hardware tab-এ একটা hint: "USB scanner connect করে barcode-এ trigger চাপুন"
- Beep + visual flash on successful detect