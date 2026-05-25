## POS-এ ছাড় ও fraction সমস্যা সমাধান

### সমস্যা
1. সব amount (due, line total, discount) raw float, ফলে `22.799999999999997` এর মত দেখাচ্ছে। টাকা সর্বোচ্চ ২ দশমিক হওয়া উচিত।
2. Cart item-এ ছাড় amount আলাদা করে দেখা যাচ্ছে না — শুধু input box, কিন্তু "−২ ৳" এর মত line confirmation নেই।
3. মোট (cart total) ছাড় শুধু টাকা — percentage option নেই। User চান টাকা / % দুটোই।

### সমাধান (শুধু `src/components/app/POSPage.tsx`)

**A. ২ দশমিকে round করার util**
- File-এর top-এ একটা helper: `const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;`
- `lineTotal()` এর return-এ `round2(...)` apply।
- `subtotalAfterLineDisc`, `grandTotal`, payment dialog-এ পাঠানো `price = lineTotal/qty` — সব `round2`।
- DueDialog-এ যে amount auto-fill হয় (`grandTotal - paid`) সেটাও `round2`। (DueDialog already shows numeric input; root cause হলো grandTotal-ই rounded থাকলে আর fraction problem থাকবে না।)

**B. Per-line discount amount visible**
- Discount input row-এ একটা ছোট badge যোগ করব: যখন discount > 0, input-এর বাঁ পাশে দেখাব actual ছাড়ের টাকা।
  - `pct` mode হলে: `−{fmtMoney(round2(qty*price*pct/100))}`
  - `amt` mode হলে: `−{fmtMoney(round2(amt))}`
- Style: `text-[10px] text-destructive font-semibold`।

**C. Cart total ছাড়েও % / ৳ toggle**
- নতুন state: `discountMode: "amt" | "pct"` (default `"amt"`, backward compatible)।
- Existing `discount` string state ওই mode অনুযায়ী interpret হবে।
- UI: "Fixed discount" row পরিবর্তে label "ছাড়" + input + ছোট `%` / `৳` toggle (cart item-এর মত একই pattern)।
- `grandTotal` calc:
  ```
  const totalDiscValue = discountMode === "pct"
    ? round2(subtotalAfterLineDisc * (Number(discount)||0) / 100)
    : round2(Number(discount)||0);
  grandTotal = round2(max(0, subtotalAfterLineDisc - totalDiscValue + delivery));
  ```
- Summary row-এ `-{fmtMoney(totalDiscValue)}` দেখাবে; percent display আর hardcoded compute না করে সরাসরি `discountMode === "pct" ? discount+"%" : ...`।
- Payment dialog-এ যেখানে `discount={Number(discount)||0}` pass হচ্ছে — সেটা `totalDiscValue` দিয়ে replace (so DB-তে সঠিক টাকা যায়)।

**D. Bulk-discount-all helper**
- এখন শুধু % prompt করে। রাখব as-is (already %), শুধু prompt label-এ "% (০-১০০)" clear রাখব।

### যা পরিবর্তন হবে না
- Backend schema, payment flow, sale insert, i18n strings (এক-দুটো নতুন label inline বাংলা/English ternary দিয়ে যোগ হবে), product grid, sidebar, shortcuts।

### Files
- `src/components/app/POSPage.tsx` — উপরের A/B/C/D সব এক ফাইলে।
