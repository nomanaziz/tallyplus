## লক্ষ্য

বিক্রয়ের সময় কোনো product-এর stock-এর চেয়ে বেশি বিক্রি করা যাবে না। Stock minus হবে না, সর্বোচ্চ zero-তে নামবে। যদি কেউ আরো বিক্রি করতে চায়, আগে Products/Stock screen থেকে stock বাড়িয়ে নিতে হবে।

## Scope

শুধু **store products** (যেগুলোর `product_id` আছে) — এবং শুধু **sell mode**-এ enforce হবে।  
Bypass হবে: `purchase` mode (ক্রয় বাড়ায়), services (stockless), Quick Order-এর external/typed items (`productId === null`)।

## পরিবর্তন

### 1. `src/components/app/POSPage.tsx`

ছোট helper: `cartQtyOf(productId)` যেটা cart-এ ওই product-এর বর্তমান qty রিটার্ন করে।

- **`addToCart(p)`** — sell mode-এ entry বা increment হওয়ার আগে চেক:
  - `p.stock <= 0` → toast error: "স্টক শেষ — আগে স্টক যোগ করুন / Out of stock — please update stock first"। কার্টে যোগ হবে না।
  - `cartQtyOf(p.id) + 1 > p.stock` → toast error: "মাত্র {stock}টি স্টকে আছে / Only {stock} in stock"। যোগ হবে না।
- **Quick `Add 2` / `Add 5` dropdown items (lines ~520)** — একই check; allowed delta = `min(requested, stock - inCart)`। 0 হলে block।
- **`updateCart(idx, { qty })`** — নতুন qty `> p.stock` হলে cap করে দেবে এবং toast দেখাবে। (cart row-এর +/- বাটন এবং manual qty input দুটোই এই path দিয়ে যায়।)
- **Checkout submit (lines ~870)** — final guard: cart-এর প্রতিটি product item-এর জন্য সদ্য-fetched `products.stock` query করে verify করবে; যদি কোনোটি বেশি হয়, toast error দিয়ে abort (race condition থেকে রক্ষা)।
- **UI hints**:
  - Product card/list-এ যখন `stock <= 0`, "+" বাটন `disabled` দেখাবে।
  - Cart row qty input-এ `max={product.stock}` set করবে যাতে keyboard টিপলেও spinner বাড়ে না।

### 2. `src/pages/app/QuickOrder.tsx`

`convertToSale` শুরুর আগে যে rows-এর `productId` আছে, সেগুলোর জন্য `products.stock` fetch করে check:
- যদি `row.qty > stock` → toast error: "{name}: only {stock} in stock"। abort।
- External rows (`productId === null`) skip।

### 3. কোনো DB schema বা migration লাগবে না

Existing `products.stock` column ব্যবহার হচ্ছে; insert path-এ ইতিমধ্যে `Math.max(0, ...)` আছে যেটা defense-in-depth হিসেবে রাখা হবে।

## যা পরিবর্তন হবে না

- Purchase / stock-in flow।
- Returns flow।
- Services বা serialized products (already gated)।
- Quick Sell sheet (amount-only, কোনো product line নেই)।

## ফাইল

- `src/components/app/POSPage.tsx`
- `src/pages/app/QuickOrder.tsx`
