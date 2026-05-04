
-- =========================
-- 1. services table
-- =========================
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  category_id uuid,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  duration_minutes int,
  duration_label text,
  unit text NOT NULL DEFAULT 'service',
  warranty_enabled boolean NOT NULL DEFAULT false,
  warranty_value int,
  warranty_unit text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_marketplace_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  home_service boolean NOT NULL DEFAULT false,
  service_charge_extra numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_services_shop ON public.services(shop_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_services_category ON public.services(category_id);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view services"
  ON public.services FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can insert services"
  ON public.services FOR INSERT
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can update services"
  ON public.services FOR UPDATE
  USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can delete services"
  ON public.services FOR DELETE
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- 2. service_categories table
-- =========================
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_service_categories_shop_name_root
  ON public.service_categories(shop_id, name) WHERE parent_id IS NULL;
CREATE INDEX idx_service_categories_shop ON public.service_categories(shop_id);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view service categories"
  ON public.service_categories FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can insert service categories"
  ON public.service_categories FOR INSERT
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can update service categories"
  ON public.service_categories FOR UPDATE
  USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can delete service categories"
  ON public.service_categories FOR DELETE
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE TRIGGER trg_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Add the FK from services.category_id now that table exists
ALTER TABLE public.services
  ADD CONSTRAINT fk_services_category
  FOREIGN KEY (category_id) REFERENCES public.service_categories(id) ON DELETE SET NULL;

-- =========================
-- 3. marketplace_service_listings
-- =========================
CREATE TABLE public.marketplace_service_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 0,
  warranty_value int,
  warranty_unit text,
  is_published boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_msl_shop ON public.marketplace_service_listings(shop_id);
CREATE INDEX idx_msl_service ON public.marketplace_service_listings(service_id);
CREATE UNIQUE INDEX uq_msl_service ON public.marketplace_service_listings(service_id);

ALTER TABLE public.marketplace_service_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published service listings"
  ON public.marketplace_service_listings FOR SELECT
  USING (is_published = true);
CREATE POLICY "Shop members can view all service listings"
  ON public.marketplace_service_listings FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can insert service listings"
  ON public.marketplace_service_listings FOR INSERT
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can update service listings"
  ON public.marketplace_service_listings FOR UPDATE
  USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can delete service listings"
  ON public.marketplace_service_listings FOR DELETE
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE TRIGGER trg_msl_updated_at
  BEFORE UPDATE ON public.marketplace_service_listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- 4. service_warranties
-- =========================
CREATE TABLE public.service_warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  sale_item_id uuid REFERENCES public.sale_items(id) ON DELETE SET NULL,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sw_shop ON public.service_warranties(shop_id);
CREATE INDEX idx_sw_expires ON public.service_warranties(expires_at);

ALTER TABLE public.service_warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view service warranties"
  ON public.service_warranties FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can insert service warranties"
  ON public.service_warranties FOR INSERT
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can update service warranties"
  ON public.service_warranties FOR UPDATE
  USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members can delete service warranties"
  ON public.service_warranties FOR DELETE
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE TRIGGER trg_sw_updated_at
  BEFORE UPDATE ON public.service_warranties
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- 5. Extend sale_items
-- =========================
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;
ALTER TABLE public.sale_items
  ALTER COLUMN product_id DROP NOT NULL;

-- =========================
-- 6. Extend marketplace_orders & items
-- =========================
ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS service_address text;

ALTER TABLE public.marketplace_order_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_listing_id uuid REFERENCES public.marketplace_service_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
