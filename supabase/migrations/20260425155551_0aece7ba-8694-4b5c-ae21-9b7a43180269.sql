-- Shop profile additions
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS active_web_theme text DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS active_app_theme text DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS fb_pixel_id text,
  ADD COLUMN IF NOT EXISTS fb_pixel_token text,
  ADD COLUMN IF NOT EXISTS fb_pixel_test_id text,
  ADD COLUMN IF NOT EXISTS gtm_id text,
  ADD COLUMN IF NOT EXISTS about_us text,
  ADD COLUMN IF NOT EXISTS privacy_policy text,
  ADD COLUMN IF NOT EXISTS fraud_api_key text,
  ADD COLUMN IF NOT EXISTS fraud_api_provider text;

-- Featured flag
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Shipping packages
CREATE TABLE IF NOT EXISTS public.shipping_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  area_type text NOT NULL DEFAULT 'custom',
  price numeric NOT NULL DEFAULT 0,
  delivery_time text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipping_packages owner manage"
  ON public.shipping_packages FOR ALL
  USING (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()))
  WITH CHECK (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()));

CREATE POLICY "shipping_packages public read active"
  ON public.shipping_packages FOR SELECT
  USING (is_active = true);

CREATE TRIGGER tg_shipping_packages_updated
  BEFORE UPDATE ON public.shipping_packages
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Promo codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code)
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_codes owner manage"
  ON public.promo_codes FOR ALL
  USING (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()))
  WITH CHECK (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()));

CREATE POLICY "promo_codes public read active"
  ON public.promo_codes FOR SELECT
  USING (is_active = true);

CREATE TRIGGER tg_promo_codes_updated
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Fraud check logs
CREATE TABLE IF NOT EXISTS public.fraud_check_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  phone text NOT NULL,
  result jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fraud_check_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fraud_logs owner manage"
  ON public.fraud_check_logs FOR ALL
  USING (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()))
  WITH CHECK (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_fraud_logs_shop_phone ON public.fraud_check_logs(shop_id, phone);