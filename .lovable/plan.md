## পার্থক্য কী, এবং কেন merge করা যায়

আপনি ঠিকই দেখেছেন — দুটো page একই `products` table-এর উপর কাজ করে, একই row দেখায়, শুধু **focus আলাদা**:

| Page | মূল কাজ | আলাদা features |
|---|---|---|
| **প্রোডাক্ট লিস্ট** (`/app/products`) | Catalog management | Add/Edit form (নাম, SKU, barcode, দাম, VAT, warranty, discount, online shop toggle, serial), Sample Import, Edit/Delete dropdown |
| **স্টক খাতা** (`/app/stock`) | Inventory view | মোট মজুদ মূল্য (cost × stock), স্টকের ইতিহাস (movements), Update Stock dialog, Stock Edit (bulk +/− করে stock update) |

দুই page-এই একই product row, একই নাম, একই বর্তমান মজুদ — শুধু action আর extra column ভিন্ন। Merge করাটা সম্পূর্ণ যৌক্তিক।

---

## প্রস্তাবিত merged page: **"প্রোডাক্ট ও স্টক"** (`/app/products`)

একটাই page যেখানে দুটো page-এর সব feature থাকবে।

### Top toolbar (সব action একসাথে)
- **প্রোডাক্ট যুক্ত করুন** (primary button — form খুলবে)
- **স্যাম্পল ইম্পোর্ট**
- **স্টক এডিট** (bulk update mode toggle)
- **স্টকের ইতিহাস** (movements dialog)
- **ডাউনলোড/প্রিন্ট**
- Search bar (DataToolbar)

### Table columns (দুই page-এর সব column একসাথে)
| পণ্যের নাম | বর্তমান মজুদ | বিক্রয় মূল্য | দর (cost) | মোট মজুদ মূল্য | Action |
|---|---|---|---|---|---|

Footer-এ "Total Products: N" + "মোট মজুদ মূল্য: ৳XX" দুটোই।

### Action column (আপনি যেমন বললেন — view + action পাশাপাশি)
প্রতি row-তে দুটো button পাশাপাশি:
1. **👁 View** (Eye icon) — `ProductDetailsDialog` খুলবে (বর্তমান মজুদ, বিক্রয় মূল্য, cost, ইতিহাস summary দেখাবে — Stock page-এর existing dialog)
2. **⋮ Action** (3-dot menu) — Edit / Stock Update / Manage Serials / Delete

### Bulk "Stock Edit" mode
উপরের toolbar-এ "স্টক এডিট" button চাপলে table-টা inline edit mode-এ চলে যাবে (StockEdit.tsx-এর +/− buttons + Save/Cancel) — আলাদা page-এ navigate করতে হবে না। অথবা চাইলে এটা `/app/products/edit-stock` সাব-route হিসেবে রাখতে পারি — আপনি বললে ঠিক করব।

### স্টকের ইতিহাস
Toolbar button → Dialog (existing `stock_movements` query)। কোনো row-এর জন্য specific history চাইলে View dialog থেকেও পৌঁছানো যাবে।

---

## পরিবর্তিত ফাইল

**Edit:**
- `src/pages/app/Products.tsx` → merged page (Stock.tsx + StockEdit.tsx-এর সব feature integrate)
- `src/components/app/AppSidebar.tsx` → "স্টকের হিসাব" menu item সরানো (একটাই থাকবে, "প্রোডাক্ট ও স্টক")
- `src/routes.tsx` → `/app/stock` ও `/app/stock-edit` route-গুলো `/app/products`-এ redirect করা (পুরনো link/bookmark ভাঙবে না)
- যেসব জায়গা থেকে `nav({ to: "/app/stock" })` বা `/app/stock-edit` call হয় (যেমন Products.tsx-এর "Add Product" button থেকে Stock.tsx-এ যাওয়ার লিংক) — সেগুলো clean up

**Delete (later, route redirect কাজ করার পরে):**
- `src/pages/app/Stock.tsx`
- `src/pages/app/StockEdit.tsx`

**নতুন কিছু লাগবে না** — সব dialog (`ProductDetailsDialog`, `UpdateStockDialog`, `ProductFormDialog`, `ProductSerialsDialog`, `SampleProductImportSheet`) ইতিমধ্যেই আছে।

---

## ছোট দুটো decision (default ধরে নিচ্ছি, আপনি বললে পাল্টাব)

1. **Stock Edit** — inline mode toggle হিসেবে রাখব (আলাদা page না), যাতে সব same page-এ থাকে। পছন্দ?
2. **Menu নাম** — "প্রোডাক্ট ও স্টক" / "Products & Stock"। অন্য নাম চাইলে বলুন (যেমন শুধু "প্রোডাক্ট" বা "ইনভেন্টরি")।

Approve করলে implement করে দিচ্ছি।