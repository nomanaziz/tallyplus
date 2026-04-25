
CREATE TABLE public.shop_delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  name text NOT NULL,
  charge numeric NOT NULL DEFAULT 0,
  free_shipping_min numeric,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zones read shop" ON public.shop_delivery_zones FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));

CREATE POLICY "zones write shop" ON public.shop_delivery_zones FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE INDEX idx_shop_delivery_zones_shop ON public.shop_delivery_zones(shop_id);

CREATE TRIGGER trg_shop_delivery_zones_updated_at
  BEFORE UPDATE ON public.shop_delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_keywords text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS google_analytics_id text,
  ADD COLUMN IF NOT EXISTS facebook_pixel_id text,
  ADD COLUMN IF NOT EXISTS privacy_policy text;
