## লক্ষ্য

মালিকের জন্য একটা ছোট accounting system যোগ করা — owner কত টাকা invest/withdraw করেছেন এবং দোকানের asset (ফ্যান, লাইট ইত্যাদি) কী কী আছে, তার জন্য আলাদা ledger ও report।

---

## ১. Database — দুইটা নতুন টেবিল

### `owner_transactions` — মালিকের invest / withdraw
| Column | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `shop_id` | uuid not null | |
| `direction` | text not null | `'invest'` (মালিক দিল) / `'withdraw'` (মালিক নিল) |
| `amount` | numeric not null | |
| `note` | text nullable | |
| `paid_via` | payment_method | default `'cash'` |
| `tx_date` | date not null default today | |
| `created_by` | uuid | |
| `created_at` / `updated_at` / `deleted_at` | | soft delete |

### `assets` — দোকানের asset (ফ্যান, লাইট, ফার্নিচার ইত্যাদি)
| Column | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `shop_id` | uuid not null | |
| `name` | text not null | যেমন "ছাদের ফ্যান" |
| `category` | text nullable | যেমন "ইলেকট্রনিক্স", "ফার্নিচার" |
| `purchase_price` | numeric not null | কত টাকায় কেনা |
| `purchase_date` | date not null | |
| `paid_via` | payment_method | default `'cash'` |
| `quantity` | int default 1 | |
| `status` | text not null | `'active'` / `'damaged'` / `'sold'` / `'disposed'` |
| `disposed_at` | date nullable | যখন নষ্ট/বিক্রি হলো |
| `disposed_value` | numeric default 0 | বিক্রি হলে কত পেয়েছেন (নষ্ট হলে 0) |
| `note` | text nullable | |
| `image_url` | text nullable | optional |
| `created_by`, `created_at`, `updated_at`, `deleted_at` | | soft delete |

**RLS:** দুই টেবিলেই — shop member হলে read/write, admin সব দেখতে পারে (existing pattern follow করবো `expenses`-এর মতো)।

---

## ২. Cash flow integration

- **Owner invest** → `cash_movements` table-এ `direction='in'`, `ref_table='owner_transactions'` (cashbox-এ টাকা ঢুকবে)
- **Owner withdraw** → `cash_movements` table-এ `direction='out'`
- **Asset purchase (cash)** → `cash_movements` direction='out', `ref_table='assets'`
- **Asset sold/disposed (with value)** → `cash_movements` direction='in'

এভাবে cashbox-এর সাথে সব sync থাকবে।

---

## ৩. UI — নতুন ৩টা page + Reports আপডেট

### Page A: `/app/owner-ledger` — মালিকের লেনদেন
- দুইটা summary card উপরে: **মোট বিনিয়োগ** (সবুজ) এবং **মোট উত্তোলন** (লাল) → পার্থক্যই net invest।
- Date range picker।
- "নতুন এন্ট্রি" button → একটা dialog: type (invest/withdraw), amount, paid_via, note, date।
- নিচে সব transaction-এর তালিকা (date, type badge, amount, note) — edit/delete সহ।

### Page B: `/app/assets` — দোকানের asset list
- উপরে summary: **মোট asset মূল্য** (active asset-এর `purchase_price` যোগফল), **নষ্ট/বিক্রিত মোট ক্ষতি**।
- "নতুন asset যুক্ত করুন" button → dialog: name, category (free text বা suggestions: ইলেকট্রনিক্স/ফার্নিচার/ডেকোরেশন), purchase_price, purchase_date, paid_via, quantity, note।
- Asset list (grid বা table): name, category, price, status badge। প্রতি row-এ action: **"নষ্ট/disposed হিসেবে চিহ্নিত করুন"** button → dialog: status (damaged/sold/disposed) + disposed_value (বিক্রি হলে) + disposed_date।
- Filter: status (all/active/damaged)।

### Page C: `/app/owner-report` — মালিকের ব্যবসায়িক রিপোর্ট
ছোট statement-style page:
```
মূলধন (Capital)
  মোট বিনিয়োগ                +X
  মোট উত্তোলন                 -Y
  ─────────────────────────
  নিট মূলধন (Net invest)     X-Y

সম্পদ (Assets)
  সক্রিয় asset (current value)  A
  নষ্ট/বিক্রিত (Loss)            L
  ─────────────────────────
  মোট asset হিসাব               A

ব্যবসার ফলাফল (Business)
  পণ্য বিক্রি থেকে লাভ          P
  অন্যান্য আয়                    +I
  অন্যান্য খরচ                   -E
  ─────────────────────────
  নিট লাভ                        P+I-E

মালিকের অবস্থান (Owner position)
  মালিকের equity = নিট মূলধন + নিট লাভ - asset loss
```
Date range picker + "ডাউনলোড/প্রিন্ট" button (existing `printReport` ব্যবহার)।

### Reports পেইজ আপডেট (`/app/reports`)
- Section 4 ("ব্যবসার সকল রিপোর্ট" grid)-এ ৩টা নতুন tile add: **মালিকের লেনদেন**, **দোকানের সম্পদ**, **মালিকের রিপোর্ট** — যেগুলো উপরের ৩টা page-এ navigate করবে।

---

## ৪. Sidebar / Bottom-nav

- **Sidebar** (`AppSidebar.tsx`): "হিসাবের খাতা" section-এ যোগ — "মালিকের লেনদেন" এবং "দোকানের সম্পদ"। "রিপোর্ট" section-এ যোগ — "মালিকের রিপোর্ট"। Permission group: existing `expense` group reuse (যেহেতু similar privilege)।
- **MobileBottomNav**: পরিবর্তন নেই (overflow drawer-এ পাওয়া যাবে)।

---

## ৫. ফাইল পরিবর্তন সংক্ষেপ

**নতুন:**
- `supabase/migrations/<ts>_owner_assets.sql` — দুই টেবিল + RLS + indexes
- `src/routes/app.owner-ledger.tsx`
- `src/routes/app.assets.tsx`
- `src/routes/app.owner-report.tsx`
- `src/components/app/OwnerTxnDialog.tsx`
- `src/components/app/AssetDialog.tsx`
- `src/components/app/AssetDisposeDialog.tsx`

**সম্পাদিত:**
- `src/lib/queries.ts` — `ownerLedgerQuery`, `assetsQuery`, `ownerReportQuery`
- `src/components/app/AppSidebar.tsx` — ৩টা link যোগ
- `src/routes/app.reports.tsx` — Section 4-এ ৩টা tile

কোনো breaking change নেই, existing Reports/Cashbox কাজ করতে থাকবে।
