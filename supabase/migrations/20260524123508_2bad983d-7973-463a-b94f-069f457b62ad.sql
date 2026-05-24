
CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  name text NOT NULL,
  location text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_warehouses_shop ON public.warehouses(shop_id);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wh_select ON public.warehouses;
DROP POLICY IF EXISTS wh_modify ON public.warehouses;
CREATE POLICY wh_select ON public.warehouses FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY wh_modify ON public.warehouses FOR ALL TO authenticated USING (public.is_shop_member(auth.uid(), shop_id)) WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  from_warehouse_id uuid,
  to_warehouse_id uuid,
  product_id uuid,
  bottle_type_id uuid,
  qty numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  note text,
  transferred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stx_shop ON public.stock_transfers(shop_id);
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stx_select ON public.stock_transfers;
DROP POLICY IF EXISTS stx_modify ON public.stock_transfers;
CREATE POLICY stx_select ON public.stock_transfers FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY stx_modify ON public.stock_transfers FOR ALL TO authenticated USING (public.is_shop_member(auth.uid(), shop_id)) WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE TABLE IF NOT EXISTS public.brand_balance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  brand_from text,
  brand_to text,
  qty numeric NOT NULL DEFAULT 0,
  size_label text,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bbe_shop ON public.brand_balance_entries(shop_id);
ALTER TABLE public.brand_balance_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bbe_select ON public.brand_balance_entries;
DROP POLICY IF EXISTS bbe_modify ON public.brand_balance_entries;
CREATE POLICY bbe_select ON public.brand_balance_entries FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY bbe_modify ON public.brand_balance_entries FOR ALL TO authenticated USING (public.is_shop_member(auth.uid(), shop_id)) WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  customer_id uuid,
  delivery_man_id uuid,
  bottle_type_id uuid,
  qty numeric NOT NULL DEFAULT 1,
  address text,
  phone text,
  status text NOT NULL DEFAULT 'assigned',
  scheduled_at timestamptz,
  delivered_at timestamptz,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deliveries_shop ON public.deliveries(shop_id);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dlv_select ON public.deliveries;
DROP POLICY IF EXISTS dlv_modify ON public.deliveries;
CREATE POLICY dlv_select ON public.deliveries FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY dlv_modify ON public.deliveries FOR ALL TO authenticated USING (public.is_shop_member(auth.uid(), shop_id)) WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE TABLE IF NOT EXISTS public.refill_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  customer_id uuid,
  bottle_type_id uuid,
  qty numeric NOT NULL DEFAULT 1,
  phone text,
  address text,
  status text NOT NULL DEFAULT 'pending',
  booked_for timestamptz,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rbk_shop ON public.refill_bookings(shop_id);
ALTER TABLE public.refill_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rbk_select ON public.refill_bookings;
DROP POLICY IF EXISTS rbk_modify ON public.refill_bookings;
CREATE POLICY rbk_select ON public.refill_bookings FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY rbk_modify ON public.refill_bookings FOR ALL TO authenticated USING (public.is_shop_member(auth.uid(), shop_id)) WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE TABLE IF NOT EXISTS public.shop_settings (
  shop_id uuid PRIMARY KEY,
  opening_capital numeric NOT NULL DEFAULT 0,
  capital_set_at timestamptz,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ss_select ON public.shop_settings;
DROP POLICY IF EXISTS ss_modify ON public.shop_settings;
CREATE POLICY ss_select ON public.shop_settings FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY ss_modify ON public.shop_settings FOR ALL TO authenticated USING (public.is_shop_member(auth.uid(), shop_id)) WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS is_empty_only boolean NOT NULL DEFAULT false;
