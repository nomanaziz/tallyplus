
-- shops: tier + marketplace toggle
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS lpg_tier text,
  ADD COLUMN IF NOT EXISTS list_in_lpg_marketplace boolean NOT NULL DEFAULT false;

-- bottle_types: tier pricing + serial tracking flag
ALTER TABLE public.bottle_types
  ADD COLUMN IF NOT EXISTS dealer_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retail_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS track_serial boolean NOT NULL DEFAULT false;

-- lpg_suppliers
CREATE TABLE IF NOT EXISTS public.lpg_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  address text,
  type text NOT NULL DEFAULT 'company',
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lpg_suppliers_shop ON public.lpg_suppliers(shop_id);

ALTER TABLE public.lpg_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lpg_sup read" ON public.lpg_suppliers;
CREATE POLICY "lpg_sup read" ON public.lpg_suppliers FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "lpg_sup write" ON public.lpg_suppliers;
CREATE POLICY "lpg_sup write" ON public.lpg_suppliers FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

-- bottle_movements: supplier link
ALTER TABLE public.bottle_movements
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.lpg_suppliers(id) ON DELETE SET NULL;

-- bottle_units (optional serial tracking)
CREATE TABLE IF NOT EXISTS public.bottle_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  bottle_type_id uuid NOT NULL REFERENCES public.bottle_types(id) ON DELETE CASCADE,
  serial_no text NOT NULL,
  status text NOT NULL DEFAULT 'full_shop',
  current_holder_contact_id uuid,
  expiry_date date,
  last_qc_date date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, serial_no)
);
CREATE INDEX IF NOT EXISTS idx_bottle_units_shop ON public.bottle_units(shop_id);
CREATE INDEX IF NOT EXISTS idx_bottle_units_type ON public.bottle_units(bottle_type_id);

ALTER TABLE public.bottle_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bu read" ON public.bottle_units;
CREATE POLICY "bu read" ON public.bottle_units FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "bu write" ON public.bottle_units;
CREATE POLICY "bu write" ON public.bottle_units FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

-- Public read for LPG marketplace listing (shops with the flag on)
DROP POLICY IF EXISTS "shops public lpg marketplace" ON public.shops;
CREATE POLICY "shops public lpg marketplace" ON public.shops FOR SELECT
  USING (list_in_lpg_marketplace = true);

DROP POLICY IF EXISTS "bottle_types public lpg marketplace" ON public.bottle_types;
CREATE POLICY "bottle_types public lpg marketplace" ON public.bottle_types FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = bottle_types.shop_id AND s.list_in_lpg_marketplace = true));
