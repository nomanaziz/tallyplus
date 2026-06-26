## পরিবর্তনের তালিকা — `src/components/app/POSPage.tsx`

### ১. Discount default টাকা (৳) — Buy + Sell দুই কার্টেই
- কার্ট লাইনের `line_discount_mode` এর default `pct` থেকে পরিবর্তন করে **`amt`** করা হবে (নতুন item add হলে initialize হবে)।
- টোগল বাটনটা থাকবে (% / ৳) যাতে দরকার হলে বদলানো যায়, তবে initial active = ৳।
- Cart-এর নিচের overall **Discount** ইনপুটও default `amt` mode থাকবে (এটা আগে থেকেই `amt`, যাচাই করা হয়েছে)।

### ২. Buy (Purchase) কার্টের card alignment + ছাদ সরানো
শুধু `mode === "purchase"` এর সময়:
- প্রতিটা cart item থেকে **per-card border/shadow/background সরানো** (`rounded-xl border bg-card shadow-sm` → শুধু `border-b` divider)। একটাই বাইরের কন্টেইনার থাকবে।
- পুরো লাইনটাকে **single horizontal row** এ সাজানো: image · নাম+ইউনিট · cost · expiry · serial · disc · qty stepper · line total · delete। flex-wrap সরিয়ে compact একটানা row।
- **+1 / +2 / +5 quick-add বাটন গুলো সরানো হবে (purchase mode এ)**। Sell mode এ যেমন আছে তেমন থাকবে।

### ৩. Sell কার্ট অপরিবর্তিত
Sell এর design / +1 +2 +5 / per-card ছাদ — সব আগের মতো থাকবে।

### ৪. Walking customer/seller — empty title fix
Checkout dialog এ যখন **Walking customer** (sell) বা **Walking seller / cash purchase** (purchase) টোগল on করে save করা হয়, এখন `customer_id` / `supplier_id` null থাকে — ফলে invoice/ledger এ contact কলাম খালি।

Fix: save এর সময় skipParty হলে contact insert পেলোডে `name` হিসেবে **"Walking customer"** (ইংরেজি) / **"ওয়াকিং কাস্টমার"** (বাংলা) সেট হবে (sell + purchase দুই ক্ষেত্রেই, user এর কথা অনুসারে দুটার জন্যই "Walking customer")। ফলে invoice ও ledger header এ ঐ নামটা দেখাবে। phone/address null থাকবে।

দুই-পথেই (online + offline branch) এই default name apply হবে।

### ফাইল
- edit: `src/components/app/POSPage.tsx` — উপরের চারটা পরিবর্তন।

DB/schema পরিবর্তন নেই।
