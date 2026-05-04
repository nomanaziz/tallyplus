# WhatsApp Share + PDF Download — Simple Plan

গ্রাহকের কাছে invoice বা বাকির হিসাব WhatsApp/Telegram-এ পাঠানোর জন্য সহজ একটা share ব্যবস্থা যোগ করব। কোনো API integration লাগবে না — browser-এর native share + `wa.me` / `t.me` link ব্যবহার করব। সাথে PDF download option থাকবে যাতে user manually attach করতে পারে।

## কী যোগ হবে

### 1. একটা reusable share utility (`src/lib/share-document.ts`)
- `generateInvoicePDF(data, lang, mode)` — existing print HTML reuse করে jsPDF + html2canvas দিয়ে PDF Blob বানাবে
- `shareViaWhatsApp(phone, text, file?)` — Web Share API থাকলে file সহ share, না থাকলে `https://wa.me/<phone>?text=<encoded>` খুলবে
- `shareViaTelegram(text)` — `https://t.me/share/url?text=...`
- `downloadPDF(blob, filename)` — ব্রাউজার download trigger
- ফোন number normalize: `+88` prepend, non-digits strip

### 2. InvoiceDialog-এ Share button
File: `src/components/app/InvoiceDialog.tsx`
- header-এ Print/POS button-এর পাশে নতুন **Share** button (dropdown):
  - WhatsApp এ পাঠাও (party.phone থাকলে auto-fill, না থাকলে phone input prompt)
  - Telegram এ share
  - PDF Download
- সব option-এ summary text: shop name, invoice no, date, grand total, paid, due, "বিস্তারিত PDF সংযুক্ত"
- WhatsApp-এ Web Share API support থাকলে PDF সহ যাবে; না থাকলে শুধু text যাবে আর PDF auto-download হয়ে যাবে যাতে user attach করতে পারে

### 3. Due Ledger / Contact panel-এ "Send Statement" button
File: `src/components/app/ContactLedgerPanel.tsx` (যেটা DueLedger-এ ব্যবহৃত)
- হেডারে নতুন **Send via WhatsApp** button
- ক্লিক করলে: customer-এর সব unpaid entries summarize করবে (date, invoice no, amount, due)
- Same share utility দিয়ে PDF + WhatsApp text পাঠাবে
- Text format (Bangla):
  ```
  প্রিয় [Name],
  আপনার মোট বাকি: ৳XXX
  বিস্তারিত:
  - 04/05/2026 INV-123: ৳200
  - 02/05/2026 INV-119: ৳150
  ধন্যবাদ — [Shop Name]
  ```

### 4. Service History-তেও same share button
File: `src/components/app/ServiceHistoryTab.tsx`
- প্রতিটা completed service row-এ Reprint button-এর পাশে Share dropdown (একই utility)

## Technical details

- Dependencies: `bun add jspdf html2canvas` (small, browser-only, no Worker code)
- PDF generation: hidden offscreen `<div>`-এ printInvoice-এর HTML render → html2canvas → jsPDF → Blob
- Web Share API check: `navigator.canShare?.({ files: [pdfFile] })`
- Phone normalize helper: যদি `01XXXXXXXXX` হয় → `8801XXXXXXXXX`
- কোনো backend/edge function লাগবে না — সব client-side

## Files to create / edit

- create: `src/lib/share-document.ts`
- create: `src/components/app/ShareMenu.tsx` (reusable dropdown button)
- edit: `src/components/app/InvoiceDialog.tsx` — add ShareMenu in header
- edit: `src/components/app/ContactLedgerPanel.tsx` — add Send Statement button
- edit: `src/components/app/ServiceHistoryTab.tsx` — add ShareMenu per row
- `package.json` — add jspdf, html2canvas

## Out of scope (পরে দরকার হলে)

- WhatsApp Business API দিয়ে server থেকে auto-send (এতে Twilio/Meta cost লাগবে)
- Bulk reminder (একসাথে অনেক customer-কে)
