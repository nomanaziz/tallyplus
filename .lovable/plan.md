## সমস্যা ও সমাধানের সারসংক্ষেপ

আপনি ৫টি আলাদা সমস্যা জানিয়েছেন — POS/বিক্রয়, ক্রয় লিস্ট, খরচের বই, কাস্টমার তথ্য, এবং subcategory dropdown। নিচে প্রতিটির root cause এবং কী পরিবর্তন হবে দেওয়া হলো।

---

### ১. ক্রয় লিস্টে stock-শেষ product দেখাচ্ছে না

**Root cause:** `src/lib/queries.ts` এর `productsLiteQuery`-তে একটা filter আছে:
```
.or("track_stock.eq.false,stock.gt.0")
```
এই filter database থেকেই out-of-stock product বাদ দিয়ে দিচ্ছে — তাই বিক্রয় ও ক্রয় দুই জায়গাতেই missing।

**সমাধান:**
- `productsLiteQuery` থেকে `.or(...)` filter সরিয়ে দেব → সব active product আসবে।
- বিক্রয়ে (sell mode) UI-তে out-of-stock গুলো default-এ hide হবে এবং একটা **"সব দেখাও / Show all"** toggle থাকবে (পয়েন্ট ৫ দেখুন)।
- ক্রয়ে (purchase mode) সব product সবসময় দেখাবে।

---

### ২. Stock update হলে POS-এ instant reflect হচ্ছে না; Refresh button কাজ করে না

**Root cause:** `loadProducts` শুধু React Query invalidate করে, কিন্তু `cacheQueryFn` IndexedDB cache fallback ব্যবহার করছে, যেটা stale stock দেখাচ্ছে। Background sync নেই।

**সমাধান:**
- Refresh button-এ click করলে cache bypass করে fresh fetch হবে (`refetchType: 'active'` + cache bust)।
- `products` table-এ Supabase Realtime subscription যোগ করব (POSPage mount-এ): stock change হলে query auto-invalidate হবে — browser refresh ছাড়াই update আসবে।
- Realtime enable করতে migration লাগবে:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  ```

---

### ৩. খরচের বই: "নতুন মাসিক খরচ" এবং "Variable" শব্দ পরিবর্তন

**Root cause:** `RecurringExpensesPanel` শুধু মাসিক recurring expense এর জন্য বানানো। `kind: variable | fixed` — technical term, ব্যবহারকারীর কাছে অর্থহীন।

**সমাধান (UI-only, কোনো DB schema change ছাড়া):**
- Section heading "নতুন মাসিক খরচ" → **"খরচের ক্যাটাগরি ও নিয়মিত খরচ"**।
- Frequency field: `daily | monthly | one-time (এককালীন)` — user-friendly শব্দ।
- "Variable / Fixed" শব্দ সরিয়ে দেব। Field name হবে **"খরচের ধরন"** কিন্তু value দেখাব "নির্দিষ্ট পরিমাণ" বা "পরিবর্তনশীল পরিমাণ" — অথবা পুরোপুরি সরিয়ে দেব, যেহেতু amount তো প্রতিবার এডিট করাই যায়।
- Preset tiles (দোকান ভাড়া, পরিবহন, ইউটিলিটি, বেতন, অন্যান্য) এর পাশে **"+ নতুন ক্যাটাগরি"** button — user নিজে category add করতে পারবে (localStorage-এ shop-ভিত্তিক সংরক্ষণ, যেহেতু expenses table-এ `category` free-text)।
- এই কাস্টম category গুলো পরবর্তীতে dropdown ও tile-এ দেখাবে।

---

### ৪. বিক্রয়ে কাস্টমার তথ্য বাধ্যতামূলক — Walk-in customer option

**Root cause:** `POSPage.tsx` line ~1108-1109:
```ts
if (!partyName.trim()) toast.error(nameRequired);
if (!partyPhone.trim()) toast.error(mobileRequired);
```

**সমাধান (Sell mode-এ মাত্র):**
- চেকআউট/Due dialog-এ একটা **"ওয়াকিং কাস্টমার"** toggle/checkbox দেব (default ON)।
- ON থাকলে: কোনো নাম/mobile/address ছাড়াই sale save হবে — customer record তৈরি হবে না; sale-এ `customer_id = null`, note-এ "Walk-in" tag।
- OFF করলে: শুধু **নাম** required, mobile/address optional।
- Sales report-এ customer-নেই sale গুলো "ওয়াকিং কাস্টমার" হিসেবে দেখাবে।
- `QuickSellSheet`-এও একই behavior।

---

### ৫. POS-এ "Show all" toggle এবং subcategory dropdown

**সমাধান (Show all):**
- Sell mode-এ search bar-এর পাশে একটা **"স্টক ছাড়াও দেখাও"** toggle। Default: শুধু in-stock দেখাবে।
- Toggle ON করে out-of-stock product-এ click করলে একটা ছোট dialog খুলবে যেখানে stock quantity এন্টার করে instantly update + cart-এ add — যা ইতিমধ্যে `QuickAddProductDialog`-এর কাছাকাছি আছে, সেটাকে adapt করব।

**Subcategory dropdown:** "সব ক্যাটাগরি / All Categories" button (line 525-531 in POSPage) এ এখন কোনো `onClick`/dropdown যুক্ত নেই — শুধু visual। এটাকে functional করব: shop-এর categories list থেকে dropdown, এবং selected category-এর subcategories nested দেখাবে। Category select হলে product list filter হবে।

---

## টেকনিক্যাল ফাইল-পরিবর্তন তালিকা

1. `src/lib/queries.ts` — `productsLiteQuery` থেকে stock filter সরানো।
2. `src/components/app/POSPage.tsx` —
   - Realtime subscription on `products`
   - Refresh button cache-bust
   - "Show all" toggle (sell mode)
   - Out-of-stock click → quick stock update dialog
   - Category/subcategory dropdown functional
   - Walking customer checkbox + validation softening
3. `src/components/app/QuickSellSheet.tsx` — walking customer + optional phone।
4. `src/components/app/RecurringExpensesPanel.tsx` (অথবা যে file খরচের preset/recurring section render করে) — heading rename, "variable" শব্দ সরানো, frequency UI, custom category add।
5. `src/pages/app/ExpenseLedger.tsx` — preset tiles + কাস্টম category integration।
6. একটা migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.products;`

## যা পরিবর্তন হবে না

- Database schema (expenses, products, sales tables) — শুধু realtime publication।
- Business logic যেমন stock decrement, price calculation।
- অন্যান্য পেজ/মডিউলের behavior।

---

**আপনি কি এই plan-এ এগোতে বলবেন?** চাইলে কোনো অংশ বাদ দিতে বা আগে কোনটা করতে চান বলুন।