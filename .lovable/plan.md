
# Shop Type পুনর্গঠন — Major Category ভিত্তিক

## লক্ষ্য
১৮টা shop type এর জায়গায় **৭-৮টা major business category** দেখানো হবে signup/shop-create form-এ। প্রত্যেক category-র description এ লেখা থাকবে "এটা কাদের জন্য / কোন ধরনের দোকান এই category-তে পড়ে"।

## নতুন Category List

| # | Category | কাদের জন্য | Module |
|---|---|---|---|
| 1 | 🏪 **General / Retail Shop** *(default)* | মুদি, ফার্মেসি, স্টেশনারি, কসমেটিক্স, কাপড়, ইলেকট্রনিক্স, মোবাইল, কাঁচাবাজার, হার্ডওয়্যার, বেকারি, জেনারেল স্টোর, others — যে কোনো সাধারণ পণ্য বিক্রির দোকান | common (products+sell+purchase) |
| 2 | 📦 **Wholesale / Distributor** | পাইকারি ব্যবসা, ডিলার, ব্র্যান্ড সরবরাহকারী | common + tier pricing |
| 3 | 🍽️ **Restaurant / Food** | রেস্টুরেন্ট, ফাস্ট ফুড, হোটেল, ক্যাফে, বেকারি (kitchen sale) | restaurant module |
| 4 | 🔧 **Service Business** | সেলুন, বিউটি পার্লার, রিপেয়ার শপ, ওয়ার্কশপ, কনসালটেন্সি, যেকোনো সার্ভিস | services module |
| 5 | ⛽ **LPG Gas** | LPG সিলিন্ডার ডিলার, গ্যাস বিক্রেতা | lpg module |
| 6 | 💧 **Water Bottle / Filter** | পানির বোতল, ফিল্টার, জার পানি ব্যবসা | lpg module (water variant) |
| 7 | 💻 **Digital Products** | সফটওয়্যার, ই-বুক, কোর্স, লাইসেন্স, subscription — physical stock নাই | online_shop + digital flag |
| 8 | 🛒 **Online Shop Only** *(optional)* | শুধু e-commerce, কোনো physical দোকান নাই | online_shop module |

## কাজের ধাপ

### ১. Database — `shop_types` table পুনর্গঠন
- নতুন column যোগ: `includes_bn TEXT`, `includes_en TEXT` (description এ "এই category-তে কী কী পড়ে" লেখা থাকবে)
- নতুন column: `category_group TEXT` (major group identifier — `retail`, `wholesale`, `restaurant`, `service`, `lpg`, `water`, `digital`, `online`)
- পুরাতন ১৮টা row এর `is_active` কোনটা off হবে না — backward compatibility থাকবে (পুরাতন shop যেগুলা specific type select করেছিল তারা যেমন আছে তেমনই চলবে)
- ৭-৮টা নতুন "group head" row insert করা হবে (sort_order উপরে, description সহ)
- পুরাতন specific row গুলোর sort_order পেছনে নেয়া হবে (hidden না, কিন্তু default form-এ দেখাবে না)

### ২. Signup / Shop creation form
- শুধু `category_group IS NOT NULL` filter করে নতুন ৭-৮টা card দেখানো হবে
- প্রত্যেক card-এ: icon + name + ছোট description ("এই category-তে আছে: মুদি, ফার্মেসি, স্টেশনারি...")
- Default selection: **General / Retail Shop**

### ৩. Shop Settings (existing shop)
- পুরাতন shop যাদের specific type ছিল (যেমন pharmacy) — তাদের শুধু পুরাতন type-টা select-এ দেখাবে + নতুন group select করার option
- Shop type পরিবর্তন করলে module enable/disable সাথে সাথে update হবে

### ৪. Module mapping update (`src/lib/modules.ts`)
- `category_group → default modules` mapping
- `retail` → products, purchase, sales, cashbook, contacts
- `wholesale` → একই + wholesale pricing tier on
- `restaurant` → restaurant module
- `service` → services module
- `lpg` / `water` → lpg module
- `digital` → online_shop + digital-only flag
- `online` → online_shop only

### ৫. Admin page (`src/pages/admin/ShopTypes.tsx`)
- নতুন column দেখাবে: includes, category_group
- পুরাতন row গুলো manage করার option থাকবে কিন্তু "Legacy" badge সহ

## যা পরিবর্তন হবে না
- পুরাতন shop data, sale, product, customer — সব আগের মতই
- LPG ও Water-bottle আলাদা ২টা category থাকবে (user request অনুযায়ী)
- Restaurant / Service / LPG মডিউল আলাদা — শুধু selection UI clean হবে
- Admin override থাকবে — admin যেকোনো shop type যেকোনো module-এ map করতে পারবে

## Technical Note
- Migration-এ `category_group` column add → ৭টা নতুন group row insert → ১৩টা retail row-কে `category_group='retail'` + hidden tag
- Frontend-এ `shop_types` query-তে `category_group IS NOT NULL AND is_group_head=true` filter
- পুরাতন `code` (যেমন `pharmacy`, `grocery`) deprecate হবে না — শুধু signup UI থেকে hide হবে

---

**পরবর্তী**: এই plan approve করলে আমি migration লিখব → তারপর signup form + admin page update করব। সব এক flow-এ হবে।
