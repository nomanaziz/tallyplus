
-- 1. Add buyer to app_role enum (if not exists)
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'buyer';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. site_content table
CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL UNIQUE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_content public read"
  ON public.site_content FOR SELECT
  USING (is_published = true OR public.is_admin(auth.uid()));

CREATE POLICY "site_content admin write"
  ON public.site_content FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. marketplace_products
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_bn text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  category text,
  base_unit text DEFAULT 'pcs',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mp_products public read"
  ON public.marketplace_products FOR SELECT
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "mp_products admin write"
  ON public.marketplace_products FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_mp_products_updated_at
  BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. marketplace_listings
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  stock numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'pcs',
  min_order numeric DEFAULT 1,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, shop_id)
);
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mp_listings public read"
  ON public.marketplace_listings FOR SELECT
  USING (
    is_published = true
    OR public.is_shop_member(auth.uid(), shop_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "mp_listings shop write"
  ON public.marketplace_listings FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_mp_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_mp_listings_product ON public.marketplace_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_mp_listings_shop ON public.marketplace_listings(shop_id);

-- 5. seller_locations
CREATE TABLE IF NOT EXISTS public.seller_locations (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  division text,
  district text,
  upazila text,
  lat numeric,
  lng numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seller_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seller_locations public read"
  ON public.seller_locations FOR SELECT
  USING (true);

CREATE POLICY "seller_locations shop write"
  ON public.seller_locations FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_seller_locations_updated_at
  BEFORE UPDATE ON public.seller_locations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_seller_loc_division ON public.seller_locations(division);
CREATE INDEX IF NOT EXISTS idx_seller_loc_district ON public.seller_locations(district);

-- 6. Seed default site_content sections
INSERT INTO public.site_content (section, data) VALUES
  ('hero', '{
    "tagline_bn": "৫+ বছরের অভিজ্ঞতা · ২৪/৭ এক্সপার্ট সাপোর্ট",
    "tagline_en": "5+ years of experience · 24/7 expert support",
    "subheading_bn": "স্মার্টভাবে ব্যবসা করুন।",
    "subheading_en": "Run a smarter business.",
    "title_bn": "ব্যবসা বাড়ান",
    "title_en": "Grow Your Business",
    "title_highlight_bn": "ট্যালি প্লাসের সাথে।",
    "title_highlight_en": "With Tally Plus.",
    "cta_primary_bn": "শুরু করুন",
    "cta_primary_en": "Get Started",
    "cta_secondary_bn": "এক্সপার্টের সাথে কথা বলুন",
    "cta_secondary_en": "Talk to an Expert",
    "whatsapp_url": "https://wa.me/8801841577944?text=Hello",
    "stat1_value_bn": "১০,০০,০০০+",
    "stat1_value_en": "1,000,000+",
    "stat1_label_bn": "ব্যবসায়ী ব্যবহার করছেন",
    "stat1_label_en": "Businessman using",
    "stat2_value_bn": "৪.৪★",
    "stat2_value_en": "4.4★",
    "stat2_label_bn": "অ্যাপ রেটিং",
    "stat2_label_en": "App Rating"
  }'::jsonb),
  ('features', '{"note": "Edit feature rows from admin panel"}'::jsonb),
  ('pain', '{"note": "Edit pain points from admin panel"}'::jsonb),
  ('compare', '{"note": "Edit comparison table from admin panel"}'::jsonb),
  ('business_types', '{"note": "Edit business types from admin panel"}'::jsonb),
  ('testimonials', '{"note": "Edit testimonials from admin panel"}'::jsonb),
  ('pricing_intro', '{
    "title_bn": "সহজ মূল্য, কোনো লুকানো চার্জ নেই",
    "title_en": "Simple pricing, no hidden charges"
  }'::jsonb),
  ('contact', '{
    "phone": "+8801841577944",
    "email": "support@tallyplus.app",
    "address_bn": "ঢাকা, বাংলাদেশ",
    "address_en": "Dhaka, Bangladesh"
  }'::jsonb),
  ('stats', '{"note": "Edit stats strip from admin panel"}'::jsonb),
  ('final_cta', '{
    "title_bn": "আজই শুরু করুন",
    "title_en": "Start today",
    "subtitle_bn": "ফ্রি ট্রায়াল, কার্ড লাগবে না।",
    "subtitle_en": "Free trial, no card needed."
  }'::jsonb),
  ('footer', '{
    "copyright_bn": "© ট্যালি প্লাস। সর্বস্বত্ব সংরক্ষিত।",
    "copyright_en": "© Tally Plus. All rights reserved."
  }'::jsonb)
ON CONFLICT (section) DO NOTHING;
