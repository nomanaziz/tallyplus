
# তিনটা UI Polish — POS Professional Look, Sidebar Reorder, Dashboard Tile Fix

আপনার দেওয়া reference image-এর মত POS-কে professional করব, সাথে আরও দুটো ছোট fix। কোনো business logic পরিবর্তন হবে না — শুধু UI।

## ১. POS / Sell Page Redesign (`POSPage.tsx`)

Reference image-এর মত layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ [আজকের বিক্রি ৳0]  [আইটেম বিক্রি 0]  [লেনদেন 0]    User+Hold │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────┬────────────────────────┐  │
│ │ 🔍 Search [Barcode/SKU] ⌄ Cat  │  🛒 কার্ট (3)   প্রিয়ার │  │
│ │ F1:চেকআউট F2:হোল্ড ... F5:প্রিন্ট │  ┌────────────────┐    │  │
│ │ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │  │ 🖼 Drinko 250ml │    │  │
│ │ │ 🖼 │ │ 🖼 │ │ 🖼 │ │ 🖼 │    │  │ Piece ⌄         │    │  │
│ │ │name│ │name│ │name│ │name│    │  │ Unit ₹30  Disc% │    │  │
│ │ │ ৳30│ │৳1500││ ৳65│ │ ৳50│    │  │ +1 +2 +5  - 1 + │    │  │
│ │ │stk │ │stk │ │stk │ │stk │    │  └────────────────┘    │  │
│ │ └────┘ └────┘ └────┘ └────┘    │  ...                   │  │
│ │ (4-6 cols responsive)          │  সর্বমোট ৳1595         │  │
│ │                                │  ছাড় (0%): ৳0          │  │
│ │                                │  মোট: ৳1595            │  │
│ │                                │ [হোল্ড F2] [চেকআউট F1] │  │
│ └────────────────────────────────┴────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**পরিবর্তন:**

- Container: `container px-4` সরিয়ে full-width `px-4 py-3` করব যাতে large screen-এ পুরো জায়গা ব্যবহার হয়
- Top stat strip: আজকের বিক্রি / আইটেম / লেনদেন — ৩টা ছোট pill, এক সারিতে (right-aligned user name + হোল্ড count)
- Grid ratio: `lg:grid-cols-2` → `xl:grid-cols-12` দিয়ে **products = 8 cols, cart = 4 cols**
- Search/barcode/category row: একই সারিতে, rounded full inputs, dark category dropdown
- F-shortcut hint row: ছোট badge style — F1:চেকআউট, F2:হোল্ড, F3:ড্রয়ার, F4:সার্চ, F5:প্রিন্ট
- Product cards: ছবি বড় (aspect-square), নিচে name centered, price big colored (৳red/amber), stock label (`স্টক: 851 পিস`) — image-এর মত pill background
- Selected card-এ primary ring + soft background
- Cart card: প্রতি item-এ ছবি (40×40), নাম + SKU, Unit Price input (যা আছে), Discount % input, quick add buttons (+1/+2/+5), qty stepper
- Cart footer: subtotal/discount/total — bold, large numbers
- Action bar: Hold (secondary) + Checkout (primary big amber/yellow) full-width inside cart
- "প্রিয়ার" / customer chip top-right of cart — যা আছে রাখব, শুধু styling polish

**Logic অপরিবর্তিত**: হ্যান্ডলার, hot-keys, barcode, serial pick, invoice dialog, hold/resume — সব আগের মতই।

## ২. Sidebar Order Fix (`AppSidebar.tsx`)

Transactions section-এ এখন: LPG → ক্রয় → বিক্রয় → দ্রুত বিক্রি → ক্যাশবক্স

**নতুন order**: LPG → **বিক্রয়** → **দ্রুত বিক্রি** → **ক্রয়** → ক্যাশবক্স

Books section-এও একই: বিক্রয় বই → ক্রয় বই → বাকি → খরচ → মালিকের বই → সম্পদ

## ৩. Dashboard KPI Tile Fix (`Dashboard.tsx`)

দ্বিতীয় image-এ দেখা যাচ্ছে — `মোট...`, `কম...`, `অন...`, `নতুন...` truncate হয়ে যাচ্ছে কারণ:
- 9-column grid + truncate class
- Icon ডানদিকে বড় জায়গা নেয়, label-এর জন্য জায়গা কম

**নতুন KpiTile layout (icon উপরে, label নিচে)**:

```text
┌────────────────┐
│ [🎁 icon big] │   ← icon উপরে left, rounded badge
│                │
│ 36             │   ← value (বড়)
│ মোট পণ্য       │   ← label পুরো 2 lines পর্যন্ত wrap
│ বিস্তারিত দেখুন→│
└────────────────┘
```

- Icon move from top-right → top-left (smaller, 8×8 instead of 9×9)
- Label: `truncate` সরিয়ে `line-clamp-2` দিব → পুরো শব্দ পড়া যাবে ("নতুন অনলাইন অর্ডার" সম্পূর্ণ)
- Value-কে আরও বড় (28-30px) এবং label-এর উপরে আনব
- Grid: `xl:grid-cols-9` → `xl:grid-cols-6 2xl:grid-cols-9` যাতে normal desktop-এ tile বড় থাকে

## কাজের ফাইল

| File | পরিবর্তন |
|---|---|
| `src/components/app/POSPage.tsx` | Header strip + 12-col layout + product card + cart polish |
| `src/components/app/AppSidebar.tsx` | Transactions ও Books section item reorder |
| `src/pages/app/Dashboard.tsx` | `KpiTile` ও tile grid redesign |

## যা পরিবর্তন হবে না

- POS-এর কোনো logic (cart, checkout, hold, invoice, barcode, serial pick, hotkeys)
- Sidebar-এর সব route, permission, module gating
- Dashboard-এর data query বা KPI calculation
- Mobile bottom nav, AppTopbar — অপরিবর্তিত
- কোনো DB migration লাগবে না

---

Approve করলে তিনটাই এক flow-এ করব।
