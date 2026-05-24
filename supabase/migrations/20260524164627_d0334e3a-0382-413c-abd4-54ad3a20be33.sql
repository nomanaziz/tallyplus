
-- 1. New columns
ALTER TABLE public.shop_types
  ADD COLUMN IF NOT EXISTS category_group TEXT,
  ADD COLUMN IF NOT EXISTS is_group_head BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS includes_bn TEXT,
  ADD COLUMN IF NOT EXISTS includes_en TEXT;

CREATE INDEX IF NOT EXISTS idx_shop_types_group_head ON public.shop_types (is_group_head, sort_order) WHERE is_active = true;

-- 2. Map existing rows to category_group (legacy rows — keep is_group_head=false so signup form hides them)
UPDATE public.shop_types SET category_group = 'retail'    WHERE code IN ('pharmacy','grocery','vegetable','electronics','mobile','stationery','cosmetics','clothing','hardware','bakery','general','others');
UPDATE public.shop_types SET category_group = 'restaurant' WHERE code = 'restaurant';
UPDATE public.shop_types SET category_group = 'service'    WHERE code IN ('service_provider','salon_beauty','repair_shop');
UPDATE public.shop_types SET category_group = 'lpg'        WHERE code = 'lpg_gas';
UPDATE public.shop_types SET category_group = 'water'      WHERE code = 'water_bottle';

-- Push legacy rows to bottom in sort
UPDATE public.shop_types SET sort_order = sort_order + 1000 WHERE is_group_head = false;

-- 3. Insert 8 new group-head rows
INSERT INTO public.shop_types (code, name_bn, name_en, icon, default_categories, default_modules, sort_order, is_active, is_group_head, category_group, includes_bn, includes_en)
VALUES
  ('group_retail', 'সাধারণ / খুচরা দোকান', 'General / Retail Shop', 'Store',
    ARRAY['সাধারণ']::text[],
    ARRAY['products','sales','purchase','expense','contacts','cashbook','reports']::text[],
    1, true, true, 'retail',
    'মুদি, ফার্মেসি, স্টেশনারি, কসমেটিক্স, কাপড়, ইলেকট্রনিক্স, মোবাইল, কাঁচাবাজার, হার্ডওয়্যার, বেকারি, জেনারেল স্টোর — যে কোনো সাধারণ পণ্য বিক্রির দোকান।',
    'Grocery, pharmacy, stationery, cosmetics, clothing, electronics, mobile, vegetable, hardware, bakery, general store — any retail shop selling physical goods.'),

  ('group_wholesale', 'পাইকারি / ডিস্ট্রিবিউটর', 'Wholesale / Distributor', 'Package',
    ARRAY['পাইকারি']::text[],
    ARRAY['products','sales','purchase','expense','contacts','cashbook','reports']::text[],
    2, true, true, 'wholesale',
    'পাইকারি ব্যবসা, ডিলার, ব্র্যান্ড সরবরাহকারী — যারা retail shop-এ পণ্য সরবরাহ করেন। Tier pricing (pieces/dozen/carton) সহ।',
    'Wholesale, dealer, distributor — supplying products to retailers. Includes tier pricing (pieces/dozen/carton).'),

  ('group_restaurant', 'রেস্টুরেন্ট / খাবার', 'Restaurant / Food', 'UtensilsCrossed',
    ARRAY['খাবার']::text[],
    ARRAY['products','sales','purchase','expense','contacts','cashbook','reports','restaurant']::text[],
    3, true, true, 'restaurant',
    'রেস্টুরেন্ট, ফাস্ট ফুড, হোটেল, ক্যাফে, kitchen-based বেকারি — টেবিল/অর্ডার/মেনু ভিত্তিক ব্যবসা।',
    'Restaurant, fast food, hotel, cafe, kitchen bakery — table/order/menu based business.'),

  ('group_service', 'সার্ভিস ব্যবসা', 'Service Business', 'Wrench',
    ARRAY['সার্ভিস']::text[],
    ARRAY['services','sales','expense','contacts','cashbook','reports']::text[],
    4, true, true, 'service',
    'সেলুন, বিউটি পার্লার, রিপেয়ার শপ, ওয়ার্কশপ, কনসালটেন্সি — যেকোনো সার্ভিস ব্যবসা। সার্ভিসের সাথে পণ্যও বিক্রি করা যাবে।',
    'Salon, beauty parlor, repair shop, workshop, consultancy — any service business. Can also sell products alongside services.'),

  ('group_lpg', 'LPG গ্যাস ডিলার', 'LPG Gas Dealer', 'Flame',
    ARRAY['LPG']::text[],
    ARRAY['lpg','sales','purchase','expense','contacts','cashbook','reports']::text[],
    5, true, true, 'lpg',
    'LPG সিলিন্ডার ডিলার, গ্যাস বিক্রেতা — বোতল ট্র্যাকিং, জামানত, খালি বোতল, ব্র্যান্ড ব্যালান্স, ডেলিভারি সহ পূর্ণাঙ্গ system।',
    'LPG cylinder dealer — full bottle tracking, deposits, empty exchange, brand balance, delivery management.'),

  ('group_water', 'পানির বোতল / ফিল্টার', 'Water Bottle / Filter', 'Droplet',
    ARRAY['পানি']::text[],
    ARRAY['lpg','sales','purchase','expense','contacts','cashbook','reports']::text[],
    6, true, true, 'water',
    'পানির বোতল, জার, ফিল্টার ব্যবসা — খালি জার ফেরত, জামানত, ডেলিভারি ট্র্যাকিং সহ।',
    'Water bottle, jar, filter business — empty jar return, deposit, delivery tracking.'),

  ('group_digital', 'ডিজিটাল প্রোডাক্ট', 'Digital Products', 'Laptop',
    ARRAY['ডিজিটাল']::text[],
    ARRAY['products','sales','expense','contacts','cashbook','reports','online_shop']::text[],
    7, true, true, 'digital',
    'সফটওয়্যার, ই-বুক, কোর্স, লাইসেন্স, subscription — কোনো physical stock নাই। Online delivery।',
    'Software, e-books, courses, licenses, subscriptions — no physical stock. Online delivery.'),

  ('group_online', 'অনলাইন শপ', 'Online Shop Only', 'ShoppingCart',
    ARRAY['অনলাইন']::text[],
    ARRAY['products','sales','expense','contacts','cashbook','reports','online_shop']::text[],
    8, true, true, 'online',
    'শুধুমাত্র e-commerce — নিজস্ব online shop, কোনো physical দোকান নাই।',
    'E-commerce only — own online shop, no physical store.')
ON CONFLICT (code) DO UPDATE SET
  name_bn = EXCLUDED.name_bn,
  name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon,
  default_modules = EXCLUDED.default_modules,
  sort_order = EXCLUDED.sort_order,
  is_group_head = EXCLUDED.is_group_head,
  category_group = EXCLUDED.category_group,
  includes_bn = EXCLUDED.includes_bn,
  includes_en = EXCLUDED.includes_en,
  is_active = true;
