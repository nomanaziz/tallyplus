## Goal

Hishabee-style screenshots অনুযায়ী সবগুলো inside পেজ পূর্ণ functional করে design করব। প্রথমে **Product List → Stock → App Access** (যেগুলোর ছবি আছে), তারপর **Purchase, Sell, Cashbox, Dashboard banner**।

---

## Batch A — Product / Stock / Access (priority)

### 1. `app.products.tsx` — Product List
- Header: "প্রোডাক্ট লিস্ট" + buttons: **ডাউনলোড/প্রিন্ট**, **+ প্রোডাক্ট যুক্ত করুন**
- Toolbar: Search input, barcode scanner button, sort dropdown ("নতুন থেকে পুরাতন"), category filter "All (n)", Refresh button
- Table: পণ্যের নাম (with thumbnail) | বর্তমান মজুদ আছে | বিক্রয় মূল্য | সাব ক্যাটাগরি | Action (3-dot menu: Edit / Delete)
- "Total Products: N" + "Showing 1 to N of N Products" footer
- **Add/Edit Product Dialog**: name, sku, barcode, category, unit, cost_price, sale_price, stock, low_stock_alert, expiry_date, image_url
- Live data from `products` table (filtered by current shop_id)

### 2. `app.stock.tsx` — Stock
- Header: "← স্টক খাতা" + buttons: **স্টকের ইতিহাস**, **স্টক এডিট**, **+ প্রোডাক্ট যুক্ত করুন**
- Same toolbar as Product List
- Table: পণ্যের নাম | বর্তমান মজুদ | দর | মোট মজুদ মূল্য (= stock × cost_price)
- Stock Edit dialog → adjust qty + write to `stock_movements` (type: adjust)
- Stock History dialog → list from `stock_movements`

### 3. `app.access.tsx` — App Access Management
- Heading: "এক্সেস ম্যানেজমেন্ট"
- Left card: "এক্সেস পদবী (n) টি" → list of members (avatar, name, OWNER badge, phone)
- Right panel: selected member details + "অ্যাপ এর লিংক পাঠান" with copy button + "যেসব ফিচারে এক্সেস পাবে" — grouped checkbox grid (কেনা / বিক্রি / বাকি / খরচ / যোগাযোগ / প্রোডাক্ট লিস্ট / স্টকের হিসাব / SMS / রিপোর্ট / টপ আপ / অনলাইন শপ / শপ / সেটিংস / অ্যাক্সেস ম্যানেজমেন্ট)
- "+ নতুন ইউজারকে এক্সেস দিন" button → dialog (phone + role)
- Data: `shop_members` + `profiles` join

---

## Batch B — Transactions & Cashbox

### 4. `app.purchase.tsx` — Purchase POS
- Two-column layout (left product picker, right cart)
- Left: "ক্রয় করার জন্য পণ্য নির্বাচন করুন" — Search, Barcode, **+** (quick add product), Refresh + product rows with **Add** button
- Right: empty state "কোন পণ্য সিলেক্ট করা হয়নি"; when items added → table (name, qty, price, total, remove)
- Bottom: ব্যাচ নং, মোট, ডিসকাউন্ট, ডেলিভারি চার্জ, সর্বমোট, **নগদ টাকা →** / **বাকি →** buttons
- Submit: insert into `purchases` + `purchase_items`, increase product stock via `stock_movements`, cash_movement on cash payment

### 5. `app.sell.tsx` — Sell POS
- Mirror of Purchase (insert `sales` + `sale_items`, decrement stock)

### 6. `app.cashbox.tsx`
- Header: "← ক্যাশবক্স" + buttons **+ ক্যাশ ইন** (green), **− ক্যাশ আউট** (red), filter dropdown "সব লেনদেন", date range, page-size, refresh
- 3 stat cards: ব্যালেন্স / ক্যাশ ইন / ক্যাশ আউট
- Transaction list from `cash_movements` with empty state "কোনো লেনদেন পাওয়া যায়নি"
- Cash In/Out dialogs → insert `cash_movements`

### 7. `app.dashboard.tsx` — banner upgrade
- Replace simple gradient with golden "পুঁজি ছাড়া বাড়তি আয়" hero banner (generated illustration)

---

## Batch C — Remaining placeholders
Quick functional tables/lists for: `purchase-ledger`, `sales-ledger`, `due-ledger`, `expense-ledger` (with add expense dialog), `contacts` (customers + suppliers tabs), `quick-sell` (single-screen quick checkout), `expiring`, `warranty`, `recycle-bin`, `reports`, `marketing`, `online-shop`, `printer`, `training` — concise table/empty-state implementations using the same shared header/toolbar pattern.

---

## Shared infrastructure

- **`src/components/app/DataToolbar.tsx`** — reusable toolbar (search + barcode + sort + filter + refresh)
- **`src/components/app/EmptyState.tsx`** — icon + message
- **`src/components/app/SectionHeader.tsx`** — back arrow + title + right action buttons (replaces uses where PageHeader is too simple)
- All numeric/currency display via small helper `formatBdt(n)` → `৳ N`
- All dialogs use existing shadcn `Dialog`
- All tables use shadcn `Table`
- All forms use react-hook-form + zod (already in project)
- Maintain BN/EN via `useI18n()`

---

## Execution order (to fit in batches)

**Batch A (this approval):** Products + Stock + Access — fully functional with DB read/write + dialogs.

**Batch B (next):** Purchase + Sell POS + Cashbox + Dashboard banner.

**Batch C (final):** Ledgers, Contacts, and remaining placeholder pages.

After each batch I will run a build to confirm no TS/route errors.

Approve করলে **Batch A** শুরু করি।
