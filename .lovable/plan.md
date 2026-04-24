# Purchase + Sell POS Pages — Plan

আপনার দেওয়া ৪টি ছবি অনুযায়ী **কেনা (Purchase)** এবং **বেচা (Sell)** পেজ একই layout-এ বানাবো। দুইটাই Two-column POS — বাঁ দিকে product picker, ডানে cart। নিচে total, discount, delivery + দুইটা বড় বোতাম: **নগদ টাকা** ও **বাকি**।

---

## Layout (দুই পেজে একই কাঠামো)

```text
┌─ Breadcrumb: Purchase / Sell ───────────────────────────────────┐
│                                                                  │
│  ┌─ পণ্য নির্বাচন করুন ──────┐  ┌─ পণ্য নির্বাচন করেছেন (3) ────┐│
│  │ [Search] [Barcode] [+] [↻]│  │ Clear cart                    ││
│  │ ─────────────────────────│  │ ┌──────────────────────────┐  ││
│  │ 📦 Product name           │  │ │ Item name                │  ││
│  │    মূল্য:1400  স্টক:0 [Add▾]│  │ │ পরিমাণ মূল্য মোট  [✕]    │  ││
│  │ 📦 Product 2  ...    [Add]│  │ └──────────────────────────┘  ││
│  │  ⋮ scrollable list        │  │  (each row: qty, price, total)││
│  └──────────────────────────┘  │                                ││
│                                │  মোট ৩,১০০                    ││
│                                │  ডিস্কাউন্ট  [0]                 ││
│                                │  ডেলিভারি   [0]                  ││
│                                │  সর্বমোট ৩,১০০                  ││
│                                │  ┌─নগদ টাকা→─┐ ┌─বাকি→──────┐ ││
│                                │  └───────────┘ └────────────┘ ││
│                                └────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

মোবাইলে দুই কলাম stack হবে — উপরে cart (collapsed), নিচে product list, অথবা ট্যাব দিয়ে toggle।

---

## Components তৈরি হবে

1. **`src/components/app/POSPage.tsx`** — shared two-column POS shell। Props: `mode: "purchase" | "sell"`. দুই পেজ এই কম্পোনেন্ট ব্যবহার করবে যেন code duplication না হয়।
2. **`src/components/app/ProductPickerList.tsx`** — search/barcode, প্রতিটা row-এ Add button + dropdown (qty +/−, "Add custom price", remove)। প্লাস (+) বোতাম দিয়ে নতুন product দ্রুত তৈরি করা যাবে ছোট dialog-এ।
3. **`src/components/app/CartPanel.tsx`** — selected items list, প্রতিটায় qty/price input + delete; একটা collapse toggle (▾) যেটা ছবিতে আছে; নিচে discount, delivery, total summary।
4. **`src/components/app/CashPaymentDialog.tsx`** — ছবি ১৬-এর "Confirm Payment" — তারিখ, টাকার পরিমাণ, মন্তব্য, supplier/customer নাম + মোবাইল + ঠিকানা, custom invoice toggle, কর্মচারীর তথ্য toggle, **মাসেজ পাঠান** toggle (SMS অবশিষ্ট: 30)। Submit → `টাকার মূল্য পেয়েছেন`.
5. **`src/components/app/DueDialog.tsx`** — ছবি ১৭/১৮-এর "Money Given Entry" — উপরে **CUSTOMER / SUPPLIER** ট্যাব (Sell-এ default Customer, Purchase-এ default Supplier), মোট প্রদেয়, কাশ পেয়েছি/দিয়েছি, name+phone+address, comment, custom invoice toggle, কর্মচারীর তথ্য toggle, msg toggle। Submit → `সেভ করুন` / `বিক্রি করুন`.
6. **`src/components/app/ContactPickerDialog.tsx`** — name input পাশে যে ছোট 👤 আইকন আছে সেটা চাপলে existing customers/suppliers থেকে বেছে নেওয়া যাবে।

---

## Routes

- **`src/routes/app.purchase.tsx`** — `<POSPage mode="purchase" />`
- **`src/routes/app.sell.tsx`** — `<POSPage mode="sell" />`

(দুটো ফাইলই আগের `PlaceholderPage` কোডকে replace করবে।)

---

## ব্যবসায়িক logic

### Cart state
লোকাল state-এ array of `{ product_id, name, qty, price, total }`। Live recompute: `subtotal = sum(total)`, `grandTotal = subtotal − discount + delivery`।

### "নগদ টাকা" ক্লিক
1. CashPaymentDialog খুলবে, amount = grandTotal (editable)।
2. Save করলে:
   - **Sell mode**: `sales` table-এ row + `sale_items` rows; `payment_method='cash'`, `paid=amount`, `due=0`; প্রতিটা item-এর জন্য `stock_movements` (`type='sale'`, qty negative) এবং `products.stock` decrement; `cash_movements` (direction='in')।
   - **Purchase mode**: `purchases` + `purchase_items`; stock increment; `cash_movements` (direction='out')।
3. SMS toggle ON থাকলে এখন placeholder (later integrate)। Toast: ✅ সফল।

### "বাকি" ক্লিক
1. DueDialog খুলবে।
2. CUSTOMER/SUPPLIER ট্যাব অনুযায়ী contact lookup/insert (`customers` বা `suppliers` table-এ phone দিয়ে find-or-create)।
3. Save করলে:
   - Sale/Purchase row insert হবে `paid = কাশ পেয়েছি/দিয়েছি field`, `due = grandTotal − paid`, `customer_id`/`supplier_id` link করে।
   - `customers.due_balance` / `suppliers.due_balance` += due।
   - Stock movements আগের মতই।
   - যদি partial cash থাকে তবে `cash_movements` row।

### Plus (+) দিয়ে quick product add
`ProductFormDialog` (already exists in products page) reuse করে quick create — শুধু name, sale_price, cost_price, stock — save হলে cart-এ auto-add।

### Add button dropdown (▾)
ছবিতে প্রতিটা Add বোতামের পাশে ছোট ▾ আছে। সেটা চাপলে: "পরিমাণ বাড়ান", "কাস্টম মূল্য", "নোট যোগ করুন" — ছোট popover।

### Class/category click → request
ছবিতে যেটা "class এ click করে request" বললেন — এটা product list-এ category badge চাপলে ওই category-র product filter হবে। DataToolbar-এ ছোট category dropdown যোগ করবো।

---

## Bilingual strings (i18n.tsx-এ যোগ হবে)

`selectProduct`, `selectedItems`, `clearCart`, `discount`, `delivery`, `subtotal`, `grandTotal`, `cashPayment`, `dueEntry`, `confirmPayment`, `moneyGivenEntry`, `customer`, `supplier`, `customInvoice`, `staffInfo`, `sendMessage`, `smsRemaining`, `received`, `given`, `purchaseDate`, `saleDate`, `customerName`, `supplierName`, `customerMobile`, `supplierMobile`, `address`, `comment`, `gotMoney`, `sellNow`, `saveBtn` — দুই ভাষায়।

---

## Order of work

1. i18n strings + small shared sub-components (`CartPanel`, `ProductPickerList`)।
2. `POSPage` shell + cart math।
3. `CashPaymentDialog` + DB write for both modes।
4. `DueDialog` (CUSTOMER/SUPPLIER tabs) + contact upsert + due balance update।
5. Quick-add product flow + Add-button dropdown menu।
6. Wire `app.purchase.tsx` ও `app.sell.tsx` রুট।
7. Build verify।

Approve করলে এই ক্রমে implement করব।
