
-- 1. pg_trgm for autocomplete
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. shop_types table
CREATE TABLE IF NOT EXISTS public.shop_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_bn text NOT NULL,
  name_en text NOT NULL,
  icon text,
  default_categories text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_types public read"
  ON public.shop_types FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "shop_types admin write"
  ON public.shop_types FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_shop_types_updated_at
  BEFORE UPDATE ON public.shop_types
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. shop_type_code on shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS shop_type_code text REFERENCES public.shop_types(code) ON DELETE SET NULL;

-- 4. Seed shop types
INSERT INTO public.shop_types (code, name_bn, name_en, icon, default_categories, sort_order) VALUES
  ('pharmacy',    'ফার্মেসি',          'Pharmacy',            'Pill',         ARRAY['ওষুধ','বেবি কেয়ার','প্রসাধনী','স্বাস্থ্য পণ্য'], 1),
  ('grocery',     'মুদি দোকান',         'Grocery',             'ShoppingBasket', ARRAY['চাল-ডাল','তেল','মসলা','বিস্কুট','পানীয়'], 2),
  ('vegetable',   'কাঁচাবাজার',         'Vegetable & Fish',    'Carrot',       ARRAY['সবজি','মাছ','মাংস','ফল'], 3),
  ('electronics', 'ইলেকট্রনিক্স',      'Electronics',         'Cpu',          ARRAY['টিভি','ফ্রিজ','ফ্যান','লাইট'], 4),
  ('mobile',      'মোবাইল ও এক্সেসরিজ', 'Mobile & Accessories','Smartphone',   ARRAY['মোবাইল','চার্জার','কভার','ইয়ারফোন'], 5),
  ('stationery',  'স্টেশনারি',         'Stationery',          'Pencil',       ARRAY['কলম','খাতা','বই','অফিস সাপ্লাই'], 6),
  ('cosmetics',   'প্রসাধনী',           'Cosmetics',           'Sparkles',     ARRAY['মেকআপ','স্কিন কেয়ার','হেয়ার কেয়ার','পারফিউম'], 7),
  ('clothing',    'কাপড়/পোশাক',        'Clothing',            'Shirt',        ARRAY['পুরুষ','মহিলা','শিশু','জুতা'], 8),
  ('hardware',    'হার্ডওয়্যার',       'Hardware',            'Wrench',       ARRAY['টুলস','পাইপ','রঙ','নির্মাণ সামগ্রী'], 9),
  ('restaurant',  'রেস্টুরেন্ট/খাবার',  'Restaurant & Food',   'UtensilsCrossed',ARRAY['ভাত','মাংস','স্ন্যাকস','পানীয়'], 10),
  ('bakery',      'বেকারি',            'Bakery',              'CakeSlice',    ARRAY['কেক','বিস্কুট','রুটি','মিষ্টি'], 11),
  ('general',     'জেনারেল স্টোর',     'General Store',       'Store',        ARRAY['বিবিধ'], 12)
ON CONFLICT (code) DO NOTHING;

-- 5. Extend marketplace_products
ALTER TABLE public.marketplace_products
  ADD COLUMN IF NOT EXISTS default_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS pack_size text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS shop_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS search_text text;

-- 6. Trigger to maintain search_text
CREATE OR REPLACE FUNCTION public.tg_mp_products_search_text()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_text := lower(
    coalesce(NEW.name_bn, '') || ' ' ||
    coalesce(NEW.name_en, '') || ' ' ||
    coalesce(NEW.brand, '') || ' ' ||
    coalesce(NEW.pack_size, '') || ' ' ||
    coalesce(NEW.barcode, '') || ' ' ||
    coalesce(NEW.category, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mp_products_search_text ON public.marketplace_products;
CREATE TRIGGER trg_mp_products_search_text
  BEFORE INSERT OR UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_mp_products_search_text();

-- 7. Backfill search_text for existing rows
UPDATE public.marketplace_products
SET search_text = lower(
  coalesce(name_bn, '') || ' ' ||
  coalesce(name_en, '') || ' ' ||
  coalesce(brand, '') || ' ' ||
  coalesce(pack_size, '') || ' ' ||
  coalesce(barcode, '') || ' ' ||
  coalesce(category, '')
);

-- 8. GIN trigram index for autocomplete
CREATE INDEX IF NOT EXISTS idx_mp_products_search_trgm
  ON public.marketplace_products
  USING gin (search_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_mp_products_shop_types
  ON public.marketplace_products
  USING gin (shop_types);
