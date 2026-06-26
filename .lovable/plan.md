## লক্ষ্য
বিক্রয় খাতা (Sales Ledger) থেকে এক ক্লিকে যেকোনো invoice **Instant Return** করার সুবিধা। আলাদা return form এ গিয়ে invoice খোঁজা, item বসানো — কোনো কিছুরই দরকার থাকবে না।

## UI পরিবর্তন (`src/pages/app/SalesLedger.tsx`)

প্রতিটি invoice row এর action menu তে নতুন দুটি option যোগ:

1. **"সম্পূর্ণ ফেরত (Instant Return)"** — পুরো invoice এক ক্লিকে return।
2. **"আংশিক ফেরত"** — একটা ছোট dialog যেখানে invoice এর item গুলো check-list আকারে আসবে, প্রতিটার পাশে qty input (default = বিক্রিত qty), নিচে refund method (Cash / Due adjust / None) আর একটা ছোট reason field।

ক্লিক করলে confirm dialog: "এই invoice এর সব পণ্য ফেরত নেওয়া হবে এবং স্টকে ফিরে যাবে — নিশ্চিত?"

## Backend logic (নতুন helper: `src/lib/instant-return.ts`)

একটা function `createInstantReturn({ saleId, items?, refundMethod })` যা নিচের কাজগুলো sequentially করবে — বর্তমান `returns/New.tsx` এর pattern অনুসরণ করে:

1. `sales` থেকে original invoice + `sale_items` fetch।
2. `sale_returns` এ নতুন row insert (auto `R-XXXX` no, total = ফেরত item গুলোর যোগফল, `restock = true`, refund_method user-pick)।
3. `sale_return_items` এ লাইন গুলো insert।
4. **Stock restore**: প্রতিটি item এর `product_id` থেকে product fetch করে — শুধু যেগুলোর `track_stock = true` সেগুলোর `stock` কে qty দ্বারা বাড়াবে (যেগুলোর stock maintain হয় না সেগুলো skip)।
5. **Sale adjustment**: `sales` row এর `total`/`paid`/`due` কমাবে (refund পরিমাণ অনুযায়ী)। `sale_adjustments` এ একটা negative entry লেখা হবে যাতে report এ trace পাওয়া যায়।
6. **Cash refund**: যদি refund method = cash এবং sale টা cash ছিল — `cash_movements` এ `direction: 'out'` entry।
7. **Due adjust**: যদি invoice এ due ছিল — `customers.due_balance` থেকে refund amount কমাবে।

সবকিছু sequentially হবে (existing offline layer queue handle করবে), শেষে `toast.success` + sales list refresh।

## ছোট কিছু বিষয়

- পুরো-ফেরত invoice কে UI তে একটা `Returned` badge দেখানো হবে (sale row এ যদি ওই sale_id এর জন্য sale_returns থাকে)।
- দ্বিতীয়বার একই invoice return আটকাতে — যদি ইতিমধ্যে fully returned থাকে তাহলে menu item disabled।
- কোনো DB schema পরিবর্তন লাগবে না — সব table আগে থেকেই আছে (`sale_returns`, `sale_return_items`, `sale_adjustments`, `cash_movements`, `stock_movements`)।

## ফাইল পরিবর্তনের সারসংক্ষেপ

- নতুন: `src/lib/instant-return.ts` — সব return logic।
- নতুন: `src/components/app/PartialReturnDialog.tsx` — আংশিক ফেরতের জন্য item-pick dialog।
- edit: `src/pages/app/SalesLedger.tsx` — action menu তে দুটি নতুন option, Returned badge, dialog mount।
