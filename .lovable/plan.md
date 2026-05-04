## সমস্যা

বর্তমান প্রিন্ট setup-এ `body.invoice-printing #invoice-print-area` এবং `#pos-print-area`-কে `position: fixed; left: 0; width: 100%` দিয়ে রেন্ডার করা হচ্ছে। এর ফলে:

1. **A4 প্রিন্টে কন্টেন্ট বাঁদিকে কেটে যাচ্ছে** — `width: 100%` মানে viewport এর পুরো প্রস্থ, কিন্তু `@page { margin: 8mm }` কারণে আসল printable area ছোট। ফলে heading "ইনভয়েস" → "য়েস" দেখাচ্ছে, "#" কলাম, পণ্যের নাম কলাম, ক্রেতার নাম/ঠিকানা সব হারিয়ে যাচ্ছে।
2. **Thermal/POS প্রিন্টে heading নেই** — `pos-print-area` এর ভেতরে আসলে heading আছে কিন্তু `position: fixed` + `width: 76mm` কারণে roll printer বা PDF এ একই ক্লিপিং হচ্ছে, এবং rows মাঝখানে page-break হয়ে কাটছে।
3. **পারফোরেশন/কাটার দাগ নেই** — receipt শেষে কোনো cut-line marker নেই।

## সমাধানের পরিকল্পনা

### ১. `position: fixed` সম্পূর্ণ বাদ দাও — flow layout ব্যবহার করো

`src/styles.css`-এর `@media print` ব্লক পুরো rewrite করো:

- Dialog ancestors-কে `position: static`, `display: block`, কোনো width/height/transform ছাড়াই reset করো (Radix portal, role=dialog, scroll viewport সবসহ)।
- Print area গুলোকে normal flow এ রেন্ডার করো — `position: static; width: auto; max-width: none;` শুধু। ব্রাউজার `@page margin` নিজেই respect করবে, আর কোনো clipping হবে না।
- `padding: 6mm` print-area থেকে সরিয়ে `@page margin`-এ নিয়ে যাও। double-padding সমস্যা শেষ।

### ২. A4 invoice — heading সবসময় পেইজের উপরে, কন্টেন্ট page-break-safe

`InvoiceDialog.tsx`-এ:
- "ইনভয়েস" heading-কে স্পষ্ট ও bold করো (already আছে, কিন্তু print-only mini header যোগ করো যাতে multi-page হলেও প্রতি page-এ shop name + invoice no top-এ থাকে)।
- টেবিলের `<thead>`-এ `display: table-header-group` + প্রতি `<tr>`-এ `page-break-inside: avoid` set করো print CSS-এ — যাতে row মাঝখানে কাটে না।
- Totals block, signatures block-এ `page-break-inside: avoid` দাও।

### ৩. Thermal/POS receipt — heading + perforation marks

`InvoiceDialog.tsx`-এর `#pos-print-area`-এ:
- উপরে shop logo (যদি থাকে) + shop name centered bold heading নিশ্চিত করো (বর্তমানে আছে, কিন্তু ক্লিপিং কারণে দেখা যাচ্ছিল না — flow layout fix-এ আপনাআপনি ফিরবে)।
- নিচে "Thank you" এর পরে **পারফোরেশন/cut line** যোগ করো:
  - একটি dashed border line (`border-top: 2px dashed #000`)
  - মাঝে ছোট্ট "✂ ---- কাটুন / CUT HERE ---- ✂" label
  - তার নিচে কয়েক mm খালি জায়গা যাতে roll cutter সঠিক জায়গায় কাটে
- প্রতি item row-এ `page-break-inside: avoid` (যদিও 80mm continuous roll-এ সাধারণত প্রযোজ্য না, PDF save-এ কাজে দেবে)।
- POS page size: `@page pos-receipt { size: 80mm auto; margin: 3mm 2mm; }` — auto height continuous roll-এর জন্য। `width: 76mm` instead of `width: 100%` রাখো যাতে 80mm roll এ 2mm করে দুই পাশে গ্যাপ পায়।

### ৪. টেস্ট

A4 print preview এবং POS print preview উভয়েই:
- পুরো heading "ইনভয়েস" দেখা যায়
- প্রথম কলাম "#" এবং সব row visible
- Customer name/phone/address rows visible
- পরিশেষে cut line + পারফোরেশন (POS এর জন্য)

### পরিবর্তিত ফাইল

- `src/styles.css` — `@media print` ব্লক rewrite (position:fixed → static, page-break rules, @page margins)
- `src/components/app/InvoiceDialog.tsx` — POS receipt-এ cut/perforation marker যোগ, A4 totals/signature block-এ `page-break-inside: avoid` class যোগ

কোনো DB, edge function বা package change লাগবে না।