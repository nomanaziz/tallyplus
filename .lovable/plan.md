# Product Delete — Reference Guard

## সমস্যা
এখন `src/pages/app/Products.tsx`-এ delete করলে শুধু `products.deleted_at` set হয়। কোনো check নেই — তাই যে product আগে বিক্রি/ক্রয় হয়েছে সেটাও silently soft-delete হয়ে যায়, ফলে ledger/report-এ orphan reference ও confusion তৈরি হয়।

User চান: stock-ই main। কোনো product delete করতে গেলে যদি ওই product আগে কোথাও sell/purchase/quotation/return/online-order হয়ে থাকে, তাহলে delete **block** হবে এবং user-কে বলা হবে — আগে ওই related records delete করুন, তারপর product delete করুন।

## যে tables-এ reference check করব
- `sale_items` — বিক্রয়
- `purchase_items` — ক্রয়
- `sale_return_items` — return
- `quotation_items` — quotation
- `marketplace_order_items` — online shop order
- `marketplace_listings` — online shop-এ listed কিনা

(`stock_movements` এবং `product_serials` parent record delete হলে এমনিই clear হবে — আলাদা block লাগবে না।)

## পরিবর্তন

### 1. `src/pages/app/Products.tsx`
নতুন helper `checkProductReferences(productIds: string[])` যেটা উপরের ৬টা table-এ `select id, count` (head:true, count:'exact') চালিয়ে প্রতিটার count আনবে। মোট > 0 হলে reference details return করবে।

**Single delete (`onDelete`)**:
- confirm-এর আগে `checkProductReferences([p.id])` কল।
- যদি reference থাকে — confirm dialog না দেখিয়ে একটা **AlertDialog** দেখাবে যেখানে list থাকবে:
  - "বিক্রয় (সেল): 3টি" → "বিক্রয় তালিকা" link `/app/sell`
  - "ক্রয়: 1টি" → `/app/purchase`
  - "Quotation: 2টি" → `/app/sell` (quotation tab)
  - "বিক্রয় ফেরত: 1টি" → `/app/returns`
  - "অনলাইন অর্ডার: 1টি" → `/app/online-shop`
  - "অনলাইন listing আছে" → `/app/online-shop`
- Message: "এই পণ্যটি delete করার আগে উপরের সব related entries আগে delete করতে হবে।"
- কোনো reference না থাকলে আগের মতই soft-delete চালাবে।

**Bulk delete (`confirmBulkDelete`)**:
- type-"delete" confirm-এর আগে selected ids দিয়ে check।
- যদি কোনো id-তে reference থাকে — যেগুলো clean সেগুলোর count দেখিয়ে option দেবে: "X টি product delete করা যাবে, Y টি product-এ reference আছে। শুধু clean গুলো delete করব?" → "হ্যাঁ" / "বাতিল"।
- "হ্যাঁ" → শুধু clean ids soft-delete হবে; blocked ids-এর জন্য toast: "Y টি product reference থাকার কারণে skip হয়েছে।"

### 2. UX detail
- Reference check parallel `Promise.all` দিয়ে — fast।
- Bulk-এর জন্য একটা single query: `select product_id from sale_items where product_id in (...)` ইত্যাদি, তারপর Set বানিয়ে blocked ids বের করব। Round-trips কম।
- নতুন AlertDialog Bangla/English দুই language support করবে (existing `lang` pattern follow)।

### 3. কোনো DB migration দরকার নেই
সব check client-side query দিয়েই হবে। RLS already এই tables-এ shop-scoped, তাই count সঠিকই আসবে।

## Out of scope
- Hard delete বা cascade delete করব না — soft-delete pattern অপরিবর্তিত।
- Stock movement / serials-এর জন্য আলাদা UI message দেব না।
- RecycleBin থেকে restore flow-এ পরিবর্তন নেই।
