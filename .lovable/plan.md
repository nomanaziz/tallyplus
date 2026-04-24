
# Hishabee-style Inside Pages — Build Plan

আপনি ৯টা স্ক্রিনশট দিয়েছেন। সব পেজে একই layout আছে: **left sidebar + top header + main content**। তাই আগে shared layout বানাব, তারপর একটা একটা করে পেজ।

## Phase 0 — Shared App Shell (foundation)

`src/routes/app.tsx` কে **layout route** বানাব (Outlet সহ)। বাকি সব পেজ child route হবে: `app.dashboard.tsx`, `app.purchase.tsx`, ইত্যাদি।

**Components তৈরি হবে:**
- `src/components/app/AppSidebar.tsx` — বাম পাশে Hishabee-স্টাইল sidebar with সাবস্ক্রিপশন কিনুন (yellow), হোম, কেনা, বেচা, ক্যাশবক্স, দ্রুত বেচা, কেনার খাতা, বেচার খাতা, বাকির খাতা, খরচের খাতা, যোগাযোগ, অ্যাপ ট্রেনিং, প্রোডাক্ট লিস্ট, স্টকের হিসাব, অ্যাপ অ্যাক্সেস, প্রিন্টার, ব্যবসার রিপোর্ট, মার্কেটিং, অনলাইন শপ, মেয়াদোত্তীর্ণ পণ্য, ওয়ারেন্টি পণ্য, রিসাইকেল বিন। আপনার দেওয়া SVG/PNG icons (`src/lib/icons.ts`) ব্যবহার হবে। Active item — হালকা নীল background।
- `src/components/app/AppTopbar.tsx` — উপরে Hishabee logo, WhatsApp icon, notification bell, সেটিংস, user avatar (initials) + dropdown।

বর্তমান `src/routes/app.tsx`-এর dashboard logic সরিয়ে `app.dashboard.tsx` এ যাবে; `app.tsx` শুধু shell + auth guard + shop check + `<Outlet />` রাখবে। যদি কোনো শপ না থাকে, এখনকার "Setup shop" card দেখাবে (এটা signup flow এ auto-create হয় তাই rare)।

`/app` URL এ গেলে `/app/dashboard` এ redirect হবে।

## Phase 1 — Pages (একটা একটা করে এই order এ)

প্রতিটা পেজ আলাদা route file হবে (`app.<name>.tsx`)। আপনার screenshots কে যত কাছাকাছি সম্ভব match করব — same labels, same layout, Bangla first।

1. **Dashboard** (`app.dashboard.tsx`) — image-5/image-4 অনুযায়ী: ব্যালেন্স chip, ৬টা stat card (আজকের বিক্রি/ক্রয়/খরচ, মোট মজুদ, পাবো, দিবো), date filter tabs (আজকের/সপ্তাহের/মাসের/বছরের/অল টাইম), রিফ্রেশ button, yellow "হিসাব পরিষ্কার" hero banner, ৩টা বড় action button (কেনা/বেচা/দ্রুত বেচা), "খাতাসমূহ" + "আপনার ব্যবসার জন্য" + "অন্যান্য" আইকন গ্রিড।

2. **Purchase / কেনা** (`app.purchase.tsx`) — image-8/image-9: বাঁ পাশে "ক্রয় করার জন্য পণ্য নির্বাচন করুন" with search, barcode, +, refresh; product list with Add button। ডান পাশে selected items, ব্যাচ নং, মোট, ডিসকাউন্ট, ডেলিভারি চার্জ, সর্বমোট, "নগদ টাকা" + "বাকি" submit buttons।

3. **Sell / বেচা** (`app.sell.tsx`) — image-10: Purchase এর mirror, কিন্তু "বিক্রি করার জন্য পণ্য নির্বাচন করুন"। একই layout reuse করব shared `<BillingScreen mode="sell|purchase" />` component দিয়ে।

4. **Cashbox / ক্যাশবক্স** (`app.cashbox.tsx`) — image-11: ৩টা summary card (ব্যালেন্স/ক্যাশ ইন/ক্যাশ আউট), "ক্যাশ ইন" + "ক্যাশ আউট" green/red buttons, transaction filter dropdown, date range picker, "10 per page", রিফ্রেশ, transaction list (empty state সহ "কোনো লেনদেন পাওয়া যায়নি")।

5. **Product List / প্রোডাক্ট লিস্ট** (`app.products.tsx`) — image-6: header + 2 buttons (ডাউনলোড/প্রিন্ট, প্রোডাক্ট যুক্ত করুন), search + barcode + sort + filter + refresh, table (পণ্যের নাম, বর্তমান মজুদ, বিক্রয় মূল্য, সাব ক্যাটাগরি, ACTION), Add product dialog।

6. **Stock / স্টকের হিসাব** (`app.stock.tsx`) — image-7: header with back, "স্টকের ইতিহাস" + "স্টক এডিট" + "প্রোডাক্টই যুক্ত করুন" buttons, search + filter + sort, table (পণ্যের নাম, বর্তমান মজুদ, দর, মোট মজুদ মূল্য)।

7. **Contacts / যোগাযোগ** (`app.contacts.tsx`) — কাস্টমার + সাপ্লায়ার tabs, list + add dialog।

8. **Sales Ledger / বেচার খাতা** (`app.sales-ledger.tsx`) — sales history table with date filter, pagination, view bill।

9. **Purchase Ledger / কেনার খাতা** (`app.purchase-ledger.tsx`) — same pattern, purchases table।

10. **Due Ledger / বাকির খাতা** (`app.due-ledger.tsx`) — কাস্টমার + সাপ্লায়ার due lists with Pay/Add due actions।

11. **Expense Ledger / খরচের খাতা** (`app.expense-ledger.tsx`) — expenses table + categories + add expense dialog।

12. **App Access / অ্যাপ অ্যাক্সেস** (`app.access.tsx`) — App-access.png অনুযায়ী: এক্সেস পদবী dropdown, owner card with phone, "যেসব ফিচারে এক্সেস পাবে" সহ category-wise toggle chips। শুধু UI, owner role এর জন্য সব checked হবে।

13. **Subscription / সাবস্ক্রিপশন কিনুন** (`app.subscribe.tsx`) — image-3: গোল্ডেন "অ্যাডভান্সড" feature box, ৪টা assurance chip (১০০% ডাটা সিকিউরিটি/ব্যাকআপ/আনলিমিটেড স্টোরেজ/২৪ ঘণ্টা সাপোর্ট), "স্পেশাল অফার" আজীবন ৳5000 (35% discount badge), রেগুলার প্যাকেজ ৳2499 + ৳5000 cards with "এখনই কিনুন" buttons।

## Phase 2 — Sidebar links wired

প্রতিটা sidebar item সঠিক route এ navigate করবে। `/` (landing) থেকে "Get Started" → `/app/dashboard`।

## Technical notes

- **Routing**: TanStack file-based, dot-separated (`app.dashboard.tsx` = `/app/dashboard`)। `app.tsx` parent layout এ `<Outlet />`।
- **Shared components**: Sidebar, Topbar, StatCard, EmptyState, DateRangePicker, BillingScreen।
- **Database**: schema আগেই আছে (sales, purchases, products, customers, suppliers, expenses, cash_movements, categories) — শুধু read/write hookup। নতুন migration লাগবে না Phase 1 এ।
- **i18n**: নতুন strings `src/lib/i18n.tsx` এ যোগ হবে (Bangla + English)।
- **Icons**: আপনার দেওয়া `src/assets/icons/*` সব পেজে ব্যবহার হবে।
- **Mobile**: sidebar mobile এ Sheet drawer হবে; desktop এ permanent।

## Delivery approach

আমি প্রতি batch এ Phase 0 + ২-৩টা পেজ deliver করব, আপনি দেখে feedback দিলে পরের batch এ যাব। প্রথম batch:

**Batch 1**: Phase 0 (sidebar + topbar + layout) + Dashboard + Subscription page।
**Batch 2**: Purchase + Sell + Cashbox।
**Batch 3**: Products + Stock + Contacts।
**Batch 4**: ৪টা Ledger + App Access।

আপনি approve করলে Batch 1 দিয়ে শুরু করব।
