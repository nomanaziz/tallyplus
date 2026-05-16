# Personal App — Mobile-First Navigation, Cash Fix & MyMoney-style Flow

## লক্ষ্য

Personal (customer) সাইডের navigation এখন লম্বা ও এলোমেলো — mobile-এ ব্যবহার কঠিন। এটাকে MyMoney-style একটা পরিষ্কার, sequential, mobile-first অভিজ্ঞতায় আনব, "নগদ" duplication ঠিক করব, এবং shopping-সংক্রান্ত পেইজগুলো একটা hub-এ merge করব।

## নতুন Information Architecture

Top-level menu মাত্র **৬টি** — যেকোনো জায়গা থেকে সবকিছু ২ ট্যাপের মধ্যে।

```text
১. হোম (Dashboard)              — ড্যাশবোর্ড, দ্রুত অ্যাকশন
২. ফর্দ (Fordo hub)             — আমার ফর্দ + নতুন ফর্দ (ট্যাব)
৩. শপিং (Shopping hub - নতুন)   — অর্ডার / প্রিয় দোকান / সার্ভিস (ট্যাব)
৪. টাকা (Money hub)             — Records / Analysis / Budgets / Accounts / Categories
                                  (নিচে ৫-আইটেম sub-nav, ঠিক MyMoney style)
৫. ইতিহাস                       — History
৬. আমি (Me)                     — প্রোফাইল, সাবস্ক্রিপশন, নোট, ট্রেনিং, লগআউট
```

### Mobile bottom-nav (always visible)

`হোম · ফর্দ · ➕ (FAB) · টাকা · আমি` — মাঝখানে বড় গোল `+` বোতাম, context-aware (টাকা ট্যাবে থাকলে নতুন আয়/ব্যয়, ফর্দ ট্যাবে থাকলে নতুন ফর্দ)।

### Money hub-এর ভেতরের sub-nav (MyMoney-এর হুবহু sequence)

`Records (আয়-ব্যয়) → Analysis → Budgets → Accounts → Categories` — page-এর নিচে sticky tab strip; কাজ করার সময় হাত নাড়াতে হবে না।

## "নগদ" duplication fix

বর্তমান `ACCOUNT_KIND_LABEL`:
- `cash: "নগদ"`     ← এটাই duplicate-এর কারণ
- `nagad: "নগদ অ্যাকাউন্ট"`

পরিবর্তন:
- `cash` → **"ক্যাশ"** (পকেটের টাকা)
- `nagad` → **"নগদ"** (mobile banking)

Default seed account-এর নাম `"নগদ"` থেকে `"ক্যাশ"` করব (নতুন user-এর জন্য; পুরোনো data touch করব না)। অ্যাকাউন্ট তৈরির form-এ ছোট helper text — "ক্যাশ = পকেটের টাকা · নগদ = মোবাইল ব্যাংকিং"।

## MyMoney-style Records ও Add screen

ছবি থেকে যা copy করব (design idea, হুবহু না):
- উপরে month switcher + EXPENSE / INCOME / TOTAL summary row
- প্রতি transaction-এ বড় round category icon, account chip, ডানে রঙিন amount
- দিন অনুযায়ী group ("১৬ মে, শনিবার")
- FAB `+` চাপলে full-screen Add sheet: `INCOME | EXPENSE | TRANSFER` toggle, Account + Category chip selectors, Notes, বড় calculator-style number pad, নিচে date/time, উপরে CANCEL / SAVE
- Transfer-এ "From account → To account" — account-এ balance না থাকলে expense disable + হালকা warning ("ক্যাশ-এ যথেষ্ট ব্যালেন্স নেই, আগে টাকা যোগ করুন")

## Analysis page

- Donut chart: ব্যয় by category + পাশে legend (percent সহ)
- প্রতি category-র জন্য progress bar row (amount + %)
- Income vs Expense bar chart (৬ মাস)
- উপরে EXPENSE / INCOME / TOTAL summary

## যা যা change/create হবে

**Edit:**
- `src/pages/customer/CustomerLayout.tsx` — ৬-আইটেম sidebar + ৫-আইটেম bottom nav + center FAB
- `src/lib/consumer-finance.ts` — `ACCOUNT_KIND_LABEL` ও default seed (`"নগদ"` → `"ক্যাশ"`)
- `src/components/customer/AccountsCategoriesDialog.tsx` — kind helper text
- `src/pages/customer/Money.tsx` — উপরে Records/Analysis/Budgets/Accounts/Categories sub-nav; MyMoney-style list ও FAB; existing functionality অক্ষুণ্ণ
- `src/pages/customer/Analytics.tsx` — donut + per-category progress rows (MyMoney style)
- `src/lib/app-routes.tsx` — নতুন hub route যোগ

**Create:**
- `src/pages/customer/Shopping.tsx` — অর্ডার / প্রিয় দোকান / সার্ভিস ট্যাব (existing ৩টি page-কে wrap করে; কোনো logic মুছবো না)
- `src/pages/customer/Me.tsx` — প্রোফাইল / সাবস্ক্রিপশন / নোট / ট্রেনিং / লগআউট card-grid

পুরোনো route (`/customer/my-orders`, `/customer/favorite-shops`, `/customer/my-services`, `/customer/notes`, `/customer/training`, `/customer/subscription`, `/customer/profile`) কাজ করবে — শুধু sidebar থেকে সরিয়ে hub-এর ভেতরে আনা হচ্ছে। কোনো business logic, কোনো backend, কোনো existing data touch হবে না — শুধু navigation + presentation + label।

## Technical notes

- শুধু frontend; নতুন migration নেই
- `MyServices.tsx` বর্তমানে service booking list দেখায় — খালি হলে hub-এ "এখনো কোনো সার্ভিস নেই" empty state
- `cash` enum value DB-তে অপরিবর্তিত — শুধু UI label বদলাচ্ছে, তাই migration লাগবে না
- Mobile-first: সব নতুন UI আগে 360px-এ design, তারপর desktop
