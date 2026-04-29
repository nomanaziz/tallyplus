# Auto-seed all sample-product categories into every shop

## ব্যবহারকারীর চাহিদা
Sample Product Import-এ যেই ৩০টা category আছে (যেমন: চাল, ডাল, তেল, মসলা, কলম, খাতা/নোটবুক, চার্জার, ইয়ারফোন, পার্সোনাল কেয়ার, ইত্যাদি), সেগুলো সবই **প্রতিটা শপে by default আগে থেকে add করা থাকবে** — তাহলে দোকানদার যখন product import করবে বা manually add করবে, তখন category dropdown-এ সব আগে থেকেই থাকবে। চাইলে নতুন category create করতে পারবে (সেটা যেমন আছে তেমনই থাকবে)।

## বর্তমান অবস্থা
- `marketplace_products` table-এ ৩১টা unique `category` (single text field) আছে। **Subcategory নেই** sample data-তে।
- `Products.tsx` এর `DEFAULT_CATEGORY_TREE` শুধু English generic categories (Electronics, Clothes ইত্যাদি) seed করে — sample import-এর actual বাংলা categories-এর সাথে মিলে না। ফলে import করার সময় new categories তৈরি হয়, কিন্তু product form খুললে ভিন্ন (English) category list দেখায় → mismatch.
- `SampleProductImportSheet` import-এর সময় missing categories on-the-fly create করে, সেটা ঠিকই কাজ করে।

## পরিবর্তন

### 1. একটা shared canonical category list বানানো
নতুন file: **`src/lib/default-categories.ts`** — যেখানে sample import-এর সব ৩১টা real category থাকবে (বাংলায়, সাথে English alias সহ যাতে dropdown সুন্দর দেখায়)। এটা single source of truth হবে।

```
চাল, ডাল, তেল, আটা/ময়দা, চিনি/লবণ, মসলা, দুধ, ডিম/অন্যান্য,
চা/কফি, পানীয়, বিস্কুট/স্ন্যাকস, নুডলস/পাস্তা, সস/আচার,
সাবান/ডিটারজেন্ট, পার্সোনাল কেয়ার,
কলম, খাতা/নোটবুক, কাগজ, ফাইল/ফোল্ডার, আঠা/টেপ, ক্যালকুলেটর,
স্টেশনারি একসেসরিজ, অফিস,
চার্জার, কেবল, ইয়ারফোন, পাওয়ার ব্যাংক, কভার/প্রটেক্টর,
একসেসরিজ, রিপেয়ার পার্টস, স্টোরেজ
```

### 2. একটা reusable seeder helper বানানো
নতুন function: **`ensureDefaultCategories(shopId)`** in same file। এটা:
- Shop-এর existing categories load করবে (name দিয়ে set বানাবে)
- Default list থেকে যে categories missing সেগুলো bulk insert করবে (`shop_id`, `name`, `parent_id: null`)
- Idempotent — বার বার call করলেও duplicate হবে না

### 3. কোথায় কোথায় seeder call হবে
- **`Products.tsx`** এর `ProductFormDialog`-এ existing lazy seed effect (line 634) replace হবে — এখন English tree এর বদলে নতুন `ensureDefaultCategories` call করবে। শুধু empty হলে নয়, **প্রতিবার dialog open-এ ensure করবে** যাতে কোনো নতুন default category future-এ যোগ হলেও auto আসে।
- **`SampleProductImportSheet.tsx`** এর `doImport` শুরুতেই `ensureDefaultCategories(current.id)` call করবে — তারপর existing dedup লজিক চালাবে। ফলে import-এর পরও সব default category থাকবে, শুধু selected ones না।
- **`AppLayout`/dashboard mount** — যখন user নতুন shop নিয়ে app-এ ঢুকে, একবার background-এ `ensureDefaultCategories(current.id)` চালাবে (silent, non-blocking)। এটাই হলো "by default সবার কাছে add" — দোকানদারের কিছু না করেও সব category আগে থেকেই থাকবে।

### 4. Import flow-এ category linking
`SampleProductImportSheet.doImport` (line 138-157) এর existing logic ঠিকই আছে — picked products-এর category names থেকে `catIdByName` map বানিয়ে `category_id` set করে। `ensureDefaultCategories` আগে চলায় সব category আগে থেকেই থাকবে, তাই missing-handling code কার্যত skip হবে কিন্তু safety net হিসেবে রাখব।

### 5. Old English tree retire
`DEFAULT_CATEGORY_TREE` (Products.tsx line 57-72) সরিয়ে দেব — confusion এড়াতে। শুধু নতুন বাংলা list থাকবে।

## কোন file-এ কী হবে
- **নতুন:** `src/lib/default-categories.ts` — list + `ensureDefaultCategories(shopId)` helper
- **edit:** `src/pages/app/Products.tsx` — old DEFAULT_CATEGORY_TREE সরানো + lazy seed effect-এ helper call
- **edit:** `src/components/app/SampleProductImportSheet.tsx` — `doImport` শুরুতে helper call
- **edit:** `src/pages/app/AppLayout.tsx` — current shop change হলে background-এ helper call (one-time per session per shop)

## DB migration
**লাগবে না।** `categories` table-এ আগে থেকেই `shop_id`, `name`, `parent_id` সব আছে। শুধু নতুন rows insert হবে — সেটা existing RLS (`is_shop_member`) দিয়ে normal user-ই করতে পারবে।

## Out of scope
- Sub-category — sample data-তে নেই, তাই এই ধাপে seed করছি না। Manual create button আগের মতই কাজ করবে।
- পুরনো shop-এ যেখানে আগে থেকেই কিছু English category seed হয়ে গেছে — সেগুলো remove হবে না, শুধু পাশাপাশি বাংলা গুলোও যোগ হবে। User চাইলে manually delete করতে পারবে।
