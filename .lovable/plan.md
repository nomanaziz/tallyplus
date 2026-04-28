# বড় তালিকাগুলোতে Sort/Filter + Pagination যোগ করা

স্টক লিস্ট সহ অন্যান্য বড় তালিকাগুলোতে স্ক্রল করতে করতে বিরক্তিকর হয়ে যায়। সমাধান — শক্তিশালী **sort + filter + pagination** একটা পুনঃব্যবহারযোগ্য system হিসেবে যোগ করা।

## ১) প্রোডাক্ট ও স্টক পেজ (`/app/products`) — সর্বোচ্চ অগ্রাধিকার

স্টক লিস্ট এই পেজেই, এখানেই বড় উন্নতি দরকার।

**নতুন Sort dropdown (toolbar-এ):**
- নামে (ক-হ / A-Z) — default
- নামে (হ-ক / Z-A)
- স্টক (বেশি → কম)
- স্টক (কম → বেশি) — কম স্টকেরগুলো উপরে দেখার জন্য
- দাম (বেশি → কম)
- দাম (কম → বেশি)
- সর্বশেষ যোগ করা

**নতুন Filter dropdown (toolbar-এ):**
- সব প্রোডাক্ট (default)
- শুধু **স্টক আছে** এমন
- শুধু **স্টক শেষ** (০)
- শুধু **কম স্টক** (low_stock_alert এর নিচে)
- শুধু **অসীম স্টক**

**Pagination:** প্রতি পেজে ২৫টা (default)। নিচে পেজ navigation: « ‹ 1 2 3 ... › ». পেজ size dropdown: 10 / 25 / 50 / 100।

`টোটাল প্রোডাক্ট: ৭০ • দেখাচ্ছে ১-২৫`

## ২) অন্যান্য বড় list page-গুলোতে একই Pagination

একই `Pagination` component পুনঃব্যবহার করে যোগ হবে:
- `Contacts` (গ্রাহক/সাপ্লায়ার লিস্ট) — sort: নাম / বকেয়া বেশি→কম
- `SalesLedger` — sort: তারিখ (নতুন/পুরানো) / টাকা বেশি→কম
- `PurchaseLedger` — একই
- `ExpenseLedger` — একই
- `RecycleBin` — সাধারণ pagination
- `Assets` — sort: নাম / মূল্য
- `Cashbox` — তারিখভিত্তিক pagination

প্রতিটাতে শুধু pagination + ১-২টা sort option। বিস্তারিত filter নয় (Products পেজের মতো নয়), যাতে UI ভারী না হয়।

## ৩) টেকনিক্যাল পরিবর্তন

**নতুন reusable components:**
- `src/components/app/Pagination.tsx` — প্রথম/আগের/পরের/শেষ button + page numbers + page size selector + "দেখাচ্ছে X-Y / Z" text। Bangla numerals সাপোর্ট।
- `src/hooks/use-pagination.ts` — `usePagination<T>(items, defaultPageSize)` hook যা `paged`, `page`, `setPage`, `pageSize`, `setPageSize`, `total` return করে। Filter/search পরিবর্তন হলে auto reset to page 1।

**Products.tsx পরিবর্তন:**
- `DataToolbar`-এর `middleExtra`-তে দুটি `Select`: Sort + Filter
- `filtered` array-এর পর `sorted` ও `final` (filter-applied) computation
- `usePagination(final, 25)` দিয়ে paging
- টেবিলের নিচে `<Pagination />`

**অন্য ৬টি page:**
- প্রতিটিতে minimal change: `usePagination` hook + `<Pagination />` table-এর নিচে। যেখানে sort প্রয়োজন সেখানে toolbar-এ একটা Select।

কোনো database migration বা edge function পরিবর্তন লাগবে না — সব client-side।
