# LPG/Gas Module Upgrade Plan — lpghisab.com এর সাথে gap বন্ধ করা

আপনার TallyPlus এ `src/pages/app/Lpg.tsx` এ একটা single-page LPG module আছে — bottle types, movements (full/empty/refill), delivery men, lpg_suppliers। কিন্তু **lpghisab.com** এ অনেক বড় system — আমি পুরোটা ঘুরে এসেছি (Dashboard, Empty Cylinder Hub, Warehouse, Transfer, Branch, Stock List, Refill Bookings, Cylinder Deposits, Brand Balance, Deliveries, Sale with Empty toggle, Add Product with Full/Empty pricing, Capital Tracker, Cash Closing)। নিচে gap গুলো phase এ ভাগ করা হলো। প্রত্যেকটা phase deliver-যোগ্য আলাদা ইউনিট।

---

## Phase 1 — Local Supplier Default (আপনার মূল request)

**লক্ষ্য**: যখন কোনো LPG supplier select করা না থাকে, system নিজে থেকে একটা "Local Supplier" নাম দেখাবে / ব্যবহার করবে। কোনো dropdown খালি বাদ যাবে না।

- Lpg.tsx এর refill / purchase / movement form গুলোতে: supplier null হলে UI তে "🏠 Local Supplier" badge।
- DB তে আলাদা row বানাব না — null = local এই rule, আর filter/report এ "Local Supplier" label show।
- Existing data unchanged।

---

## Phase 2 — Product-level Full / Empty Cylinder Type

লpghisab এ Add Product এ দুটো type: **Full Cylinder** / **Empty Cylinder**, প্রত্যেকের জন্য আলাদা **Empty Pricing** (purchase, retail, wholesale, agent)।

- `products` table এ `cylinder_type` ('full' | 'empty' | null) + `empty_purchase_price`, `empty_sale_price`, `empty_wholesale_price`, `empty_agent_price` কলাম।
- Products page এর Add/Edit form এ এই section যোগ।
- POS-এ Empty mode toggle — toggle করলে empty pricing ব্যবহার হবে।

---

## Phase 3 — Empty Cylinder Hub (নতুন page)

আলাদা page যেখানে সব brand × size এর empty stock এক জায়গায়, "+ Add Empty Cylinder" এবং "Record Empty Purchase" button সহ।

- Total Empty / Sold this month / Bought this month / Customer Pending — ৪টা stat card।
- Per-row: brand, size, empty price, total empty stock, pending, quick "+ Add"/"Set" action।
- Backed by existing `bottle_movements` aggregate।

---

## Phase 4 — Warehouse + Multi-warehouse Stock

লpghisab এ Warehouse আলাদা entity, Stock List warehouse অনুযায়ী breakup দেখায়।

- নতুন table `warehouses` (name, address, is_default, shop_id) + `stock_movements.warehouse_id`।
- Warehouse CRUD page।
- Stock List এ warehouse column + filter, low-stock alert।
- Existing data: একটা "Main Warehouse" auto-create করে সব movement ওখানে রাখা।

---

## Phase 5 — Stock Transfer between Warehouses

`stock_transfers` table (from_warehouse, to_warehouse, status, transfer_no, date) + items table। UI: list + "New Transfer" form, status (pending/completed)।

---

## Phase 6 — Cylinder Deposit / Return Tracking

লpghisab এর **Cylinder Deposits & Returns** — কাস্টমার full নিল কিন্তু empty ফেরত দিল না সেটা track।

- `customers` এ derived counters (total_bought, directly_returned, will_return_later, current_pending) — অথবা `cylinder_deposits` ledger table।
- Per-customer card view: Total bought / Directly returned / Will return later / Already returned later / Current pending + "Clear" button।
- POS sale flow এ "Empty Returning Now?" toggle।

---

## Phase 7 — Brand Balance (Cross-brand Exchange)

লpghisab এর **Brand Balance** — Bashundhara এর empty দিয়ে Omera র full আনলে সেটা track।

- `brand_balance_entries` table (brand, size, received_empty, given_full, date)।
- Page: per brand+size row → Net Balance (Surplus/Deficit) + History tab।

---

## Phase 8 — Delivery Management

লpghisab এ Deliveries আলাদা page — কোন delivery boy কোন customer কে কী cylinder দিল।

- `deliveries` table (customer_id, items[], delivery_man_id, address, date, status: assigned/out/delivered/cancelled)।
- Page: card grid per delivery, status update buttons, "Add" form।
- Existing `delivery_men` table reuse।

---

## Phase 9 — Refill Bookings (pending refill queue)

কাস্টমার আগে থেকে booking দিয়ে রাখে refill এর জন্য — pending/confirmed/delivered/cancelled status সহ list।

- `refill_bookings` table (customer_id, size, qty, date, status)।
- Page: list + Add booking + Confirm/Delivered/Cancel actions।

---

## Phase 10 — Capital Tracker

লpghisab এর "Opening Capital + Total Purchases = Total Invested, vs Current Stock Value" — investment growth chart সহ।

- `opening_capital` শুধু একটা settings field (shop_id, amount, opened_at)।
- Page: 3 stat card + month-wise line chart (cumulative capital) + monthly purchase bar chart।

---

## Phase 11 — Daily Cash Closing

দিনের শেষে total sales / collected / due / expenses / other income → Net Cash report, print করা যায়।

- Date picker + payment-method breakup (Cash/Credit/Mobile)।
- পুরোটা existing sales + cash_movements + expenses query থেকে derive — নতুন table লাগবে না।

---

## Phase 12 — Sale invoice এ "Empty" badge + Empty-only Sale

লpghisab এ sale list এ "EMPTY" badge দেখায় empty-only sale এর জন্য।

- POS এ একটা toggle "Sell as Empty"। Sale row এ `is_empty_only` flag।
- Sale List এ EMPTY badge। Filter দিয়ে empty-only sale খোঁজা।

---

## Phase 13 — Polish

- LPG dashboard widget: Total Full / Total Empty / Full by size / Empty by size — Stock List card style।
- Empty Cylinders Sold stat card on main dashboard।
- বাংলা/English label consistency।

---

# যা **পরিবর্তন হবে না**

- Auth, login, settings, online shop, marketplace, services, expense ledger।
- POS এর core flow (Phase 4 offline সহ যেটা শেষ হয়েছে)।
- Non-LPG product behavior — সব পুরোনো শপ আগের মতই চলবে।

---

# কাজের ক্রম

আপনি একটার পর একটা phase বললে আমি সেটাই করব। আমার suggestion এই sequence এ:

1. Phase 1 (Local Supplier — সবচেয়ে ছোট, request করেছেন)
2. Phase 2 (Full/Empty pricing — অন্য phase এর foundation)
3. Phase 3 (Empty Cylinder Hub)
4. Phase 6 (Cylinder Deposit)
5. Phase 7 (Brand Balance)
6. Phase 12 (Empty sale badge)
7. Phase 4 + 5 (Warehouse + Transfer একসাথে)
8. Phase 8 (Delivery)
9. Phase 9 (Refill Booking)
10. Phase 10 + 11 (Capital + Cash Closing)
11. Phase 13 (Polish)

পরের message এ শুধু "Phase 1" বা যেকোনো phase number বললে আমি সেটাই implement করব।