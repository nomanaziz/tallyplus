
-- 1) Extend subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS discount_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description_bn text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_lifetime boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS old_price_bdt numeric;

-- Replace existing plan rows with the simplified set
UPDATE public.subscription_plans SET is_active = false WHERE code NOT IN ('monthly','yearly','lifetime');

INSERT INTO public.subscription_plans (code, name_bn, name_en, price_bdt, duration_days, max_shops, is_active, is_lifetime, perks, description_bn, description_en, old_price_bdt, discount_pct)
VALUES
  ('monthly', 'মাসিক', 'Monthly', 50, 30, 2, true, false,
   '["সব ফিচার আনলক","২টি দোকান","আনলিমিটেড বিল ও পণ্য"]'::jsonb,
   'মাত্র ৫০ টাকায় মাসিক প্ল্যান', 'Monthly plan at just ৳50', NULL, 0),
  ('yearly', 'বার্ষিক', 'Yearly', 500, 365, 3, true, false,
   '["সব ফিচার আনলক","৩টি দোকান","ফ্রি WhatsApp সাপোর্ট"]'::jsonb,
   'বছরে মাত্র ৫০০ টাকায়', 'Just ৳500 per year', NULL, 0),
  ('lifetime', 'লাইফটাইম', 'Lifetime', 5000, 36500, 5, true, true,
   '["এককালীন পেমেন্ট","৫টি দোকান","সব আপডেট ফ্রি","ভিআইপি সাপোর্ট"]'::jsonb,
   'এক সাবস্ক্রিপশনেই আজীবনের হিসাব', 'One subscription, lifetime accounts', 10000, 0)
ON CONFLICT (code) DO UPDATE SET
  name_bn = EXCLUDED.name_bn,
  name_en = EXCLUDED.name_en,
  price_bdt = EXCLUDED.price_bdt,
  duration_days = EXCLUDED.duration_days,
  max_shops = EXCLUDED.max_shops,
  is_active = EXCLUDED.is_active,
  is_lifetime = EXCLUDED.is_lifetime,
  perks = EXCLUDED.perks,
  description_bn = EXCLUDED.description_bn,
  description_en = EXCLUDED.description_en,
  old_price_bdt = EXCLUDED.old_price_bdt;

-- 2) Usage limits
CREATE TABLE IF NOT EXISTS public.usage_limits (
  plan_code text NOT NULL,
  feature_key text NOT NULL,
  limit_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_code, feature_key)
);
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_limits public read" ON public.usage_limits;
CREATE POLICY "usage_limits public read" ON public.usage_limits FOR SELECT USING (true);
DROP POLICY IF EXISTS "usage_limits admin write" ON public.usage_limits;
CREATE POLICY "usage_limits admin write" ON public.usage_limits FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Seed free plan limits
INSERT INTO public.usage_limits (plan_code, feature_key, limit_count) VALUES
  ('free','purchase',10),
  ('free','sale',10),
  ('free','expense',10),
  ('free','products',10),
  ('free','due',8),
  ('free','contacts_customer',5),
  ('free','contacts_supplier',5),
  ('free','contacts_employee',1),
  ('free','stock',10)
ON CONFLICT (plan_code, feature_key) DO NOTHING;

-- Paid plans: unlimited
INSERT INTO public.usage_limits (plan_code, feature_key, limit_count)
SELECT p.code, f.key, -1
FROM (VALUES ('monthly'),('yearly'),('lifetime')) AS p(code)
CROSS JOIN (VALUES ('purchase'),('sale'),('expense'),('products'),('due'),('contacts_customer'),('contacts_supplier'),('contacts_employee'),('stock')) AS f(key)
ON CONFLICT (plan_code, feature_key) DO NOTHING;

-- 3) Promo popups
CREATE TABLE IF NOT EXISTS public.promo_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_bn text,
  title_en text,
  body_bn text,
  body_en text,
  image_url text,
  cta_text_bn text,
  cta_text_en text,
  cta_link text,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_popups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_popups public read" ON public.promo_popups;
CREATE POLICY "promo_popups public read" ON public.promo_popups FOR SELECT USING (
  is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now())
  OR public.is_admin(auth.uid())
);
DROP POLICY IF EXISTS "promo_popups admin write" ON public.promo_popups;
CREATE POLICY "promo_popups admin write" ON public.promo_popups FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4) Payment gateway settings (singleton)
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  provider text NOT NULL DEFAULT 'recharge_server',
  api_url text,
  merchant_id text,
  is_enabled boolean NOT NULL DEFAULT false,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pgs admin all" ON public.payment_gateway_settings;
CREATE POLICY "pgs admin all" ON public.payment_gateway_settings FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "pgs public read minimal" ON public.payment_gateway_settings;
CREATE POLICY "pgs public read minimal" ON public.payment_gateway_settings FOR SELECT USING (true);

INSERT INTO public.payment_gateway_settings (id, provider, is_enabled) VALUES (true, 'recharge_server', false)
ON CONFLICT (id) DO NOTHING;
