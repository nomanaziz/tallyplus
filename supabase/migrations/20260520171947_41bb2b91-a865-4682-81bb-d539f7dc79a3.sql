-- ============================================================
-- 1. shop_types: default_modules + new LPG/Water types
-- ============================================================
ALTER TABLE public.shop_types
  ADD COLUMN IF NOT EXISTS default_modules text[] NOT NULL DEFAULT ARRAY['products','sales','purchase','expense','contacts','cashbook','reports']::text[];

-- Update existing types with sensible defaults
UPDATE public.shop_types SET default_modules = ARRAY['products','sales','purchase','expense','contacts','cashbook','reports']
  WHERE code IN ('grocery','pharmacy','vegetable','electronics','mobile','stationery','cosmetics','clothing','hardware','bakery','general','others');

UPDATE public.shop_types SET default_modules = ARRAY['products','sales','purchase','expense','contacts','cashbook','reports','restaurant']
  WHERE code = 'restaurant';

UPDATE public.shop_types SET default_modules = ARRAY['services','sales','expense','contacts','cashbook','reports']
  WHERE code IN ('service_provider','salon_beauty','repair_shop');

-- New LPG and water-bottle shop types
INSERT INTO public.shop_types (code, name_bn, name_en, icon, is_active, sort_order, default_categories, default_modules)
VALUES
  ('lpg_gas', 'LPG গ্যাস', 'LPG Gas', '🔥', true, 50,
    ARRAY['১২ কেজি','২৫ কেজি','৩৫ কেজি','অন্যান্য সাইজ'],
    ARRAY['lpg','expense','contacts','cashbook','reports']),
  ('water_bottle', 'পানির বোতল / ফিল্টার', 'Water Bottle', '💧', true, 51,
    ARRAY['১৯ লিটার জার','৫ লিটার','১ লিটার','ফিল্টার সার্ভিস'],
    ARRAY['lpg','expense','contacts','cashbook','reports'])
ON CONFLICT (code) DO UPDATE SET
  default_modules = EXCLUDED.default_modules,
  default_categories = EXCLUDED.default_categories,
  is_active = true;

-- ============================================================
-- 2. shop_modules: which modules are enabled per shop
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shop_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  module_code text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, module_code)
);
CREATE INDEX IF NOT EXISTS idx_shop_modules_shop ON public.shop_modules(shop_id);

ALTER TABLE public.shop_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sm read" ON public.shop_modules;
CREATE POLICY "sm read" ON public.shop_modules FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "sm write" ON public.shop_modules;
CREATE POLICY "sm write" ON public.shop_modules FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

-- Seed defaults when a shop is created
CREATE OR REPLACE FUNCTION public.seed_shop_modules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mods text[];
  m text;
BEGIN
  SELECT default_modules INTO mods FROM public.shop_types WHERE code = NEW.shop_type_code;
  IF mods IS NULL THEN
    mods := ARRAY['products','sales','purchase','expense','contacts','cashbook','reports'];
  END IF;
  FOREACH m IN ARRAY mods LOOP
    INSERT INTO public.shop_modules(shop_id, module_code, enabled)
    VALUES (NEW.id, m, true)
    ON CONFLICT (shop_id, module_code) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_shop_modules ON public.shops;
CREATE TRIGGER trg_seed_shop_modules
  AFTER INSERT ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.seed_shop_modules();

-- Backfill existing shops
INSERT INTO public.shop_modules (shop_id, module_code, enabled)
SELECT s.id, m, true
FROM public.shops s
LEFT JOIN public.shop_types st ON st.code = s.shop_type_code
CROSS JOIN LATERAL UNNEST(COALESCE(st.default_modules, ARRAY['products','sales','purchase','expense','contacts','cashbook','reports'])) AS m
WHERE s.deleted_at IS NULL
ON CONFLICT (shop_id, module_code) DO NOTHING;

-- ============================================================
-- 3. bottle_types
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bottle_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  size_label text,
  purchase_price numeric(14,2) NOT NULL DEFAULT 0,
  sale_price numeric(14,2) NOT NULL DEFAULT 0,
  deposit_amount numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bottle_types_shop ON public.bottle_types(shop_id);
ALTER TABLE public.bottle_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bt read" ON public.bottle_types;
CREATE POLICY "bt read" ON public.bottle_types FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "bt write" ON public.bottle_types;
CREATE POLICY "bt write" ON public.bottle_types FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

-- ============================================================
-- 4. delivery_men + delivery_trips
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_men (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  vehicle_no text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_men_shop ON public.delivery_men(shop_id);
ALTER TABLE public.delivery_men ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dm read" ON public.delivery_men;
CREATE POLICY "dm read" ON public.delivery_men FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "dm write" ON public.delivery_men;
CREATE POLICY "dm write" ON public.delivery_men FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE TABLE IF NOT EXISTS public.delivery_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  delivery_man_id uuid REFERENCES public.delivery_men(id) ON DELETE SET NULL,
  trip_date date NOT NULL DEFAULT (now()::date),
  status text NOT NULL DEFAULT 'open', -- open | closed
  opening_full integer NOT NULL DEFAULT 0,
  opening_empty integer NOT NULL DEFAULT 0,
  closing_full integer,
  closing_empty integer,
  cash_collected numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_delivery_trips_shop ON public.delivery_trips(shop_id, trip_date);
ALTER TABLE public.delivery_trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dt read" ON public.delivery_trips;
CREATE POLICY "dt read" ON public.delivery_trips FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "dt write" ON public.delivery_trips;
CREATE POLICY "dt write" ON public.delivery_trips FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

-- ============================================================
-- 5. bottle_movements + holdings + deposits
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bottle_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  bottle_type_id uuid NOT NULL REFERENCES public.bottle_types(id) ON DELETE RESTRICT,
  contact_id uuid,
  delivery_id uuid REFERENCES public.delivery_trips(id) ON DELETE SET NULL,
  -- types: sale_new (নতুন বোতল বিক্রি), refill (empty নিয়ে full দিল), return_empty (শুধু খালি ফেরত), return_full (full ফেরত), purchase_full (সাপ্লায়ার থেকে কিনলো), refill_factory (factory-তে empty দিয়ে full আনলো)
  type text NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  cash_collected numeric(14,2) NOT NULL DEFAULT 0,
  deposit_change numeric(14,2) NOT NULL DEFAULT 0,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bm_shop_date ON public.bottle_movements(shop_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_bm_contact ON public.bottle_movements(contact_id);
CREATE INDEX IF NOT EXISTS idx_bm_btype ON public.bottle_movements(bottle_type_id);
ALTER TABLE public.bottle_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bm read" ON public.bottle_movements;
CREATE POLICY "bm read" ON public.bottle_movements FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "bm write" ON public.bottle_movements;
CREATE POLICY "bm write" ON public.bottle_movements FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE TABLE IF NOT EXISTS public.bottle_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  bottle_type_id uuid NOT NULL REFERENCES public.bottle_types(id) ON DELETE CASCADE,
  qty integer NOT NULL DEFAULT 0,
  deposit_held numeric(14,2) NOT NULL DEFAULT 0,
  last_movement_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, contact_id, bottle_type_id)
);
CREATE INDEX IF NOT EXISTS idx_bh_shop ON public.bottle_holdings(shop_id);
CREATE INDEX IF NOT EXISTS idx_bh_contact ON public.bottle_holdings(contact_id);
ALTER TABLE public.bottle_holdings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bh read" ON public.bottle_holdings;
CREATE POLICY "bh read" ON public.bottle_holdings FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "bh write" ON public.bottle_holdings;
CREATE POLICY "bh write" ON public.bottle_holdings FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE TABLE IF NOT EXISTS public.bottle_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  bottle_type_id uuid REFERENCES public.bottle_types(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  amount numeric(14,2) NOT NULL,
  movement_id uuid REFERENCES public.bottle_movements(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bd_shop ON public.bottle_deposits(shop_id);
CREATE INDEX IF NOT EXISTS idx_bd_contact ON public.bottle_deposits(contact_id);
ALTER TABLE public.bottle_deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bd read" ON public.bottle_deposits;
CREATE POLICY "bd read" ON public.bottle_deposits FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "bd write" ON public.bottle_deposits;
CREATE POLICY "bd write" ON public.bottle_deposits FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

-- ============================================================
-- 6. Trigger: maintain holdings + auto deposit ledger entry
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_bottle_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qty_delta integer := 0; -- change to customer holding
BEGIN
  -- Determine how customer holding changes
  IF NEW.contact_id IS NOT NULL THEN
    IF NEW.type IN ('sale_new','refill') THEN
      qty_delta := NEW.qty; -- bottle goes out to customer
    ELSIF NEW.type IN ('return_empty','return_full') THEN
      qty_delta := -NEW.qty; -- bottle comes back from customer
    END IF;
  END IF;

  IF qty_delta <> 0 THEN
    INSERT INTO public.bottle_holdings(shop_id, contact_id, bottle_type_id, qty, deposit_held, last_movement_at)
    VALUES (NEW.shop_id, NEW.contact_id, NEW.bottle_type_id, qty_delta, NEW.deposit_change, NEW.occurred_at)
    ON CONFLICT (shop_id, contact_id, bottle_type_id)
    DO UPDATE SET
      qty = public.bottle_holdings.qty + EXCLUDED.qty,
      deposit_held = public.bottle_holdings.deposit_held + NEW.deposit_change,
      last_movement_at = NEW.occurred_at,
      updated_at = now();
  END IF;

  -- Deposit ledger entry (separate from sales cash)
  IF NEW.deposit_change <> 0 AND NEW.contact_id IS NOT NULL THEN
    INSERT INTO public.bottle_deposits(shop_id, contact_id, bottle_type_id, direction, amount, movement_id, occurred_at)
    VALUES (NEW.shop_id, NEW.contact_id, NEW.bottle_type_id,
            CASE WHEN NEW.deposit_change > 0 THEN 'in' ELSE 'out' END,
            ABS(NEW.deposit_change), NEW.id, NEW.occurred_at);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_bottle_movement ON public.bottle_movements;
CREATE TRIGGER trg_apply_bottle_movement
  AFTER INSERT ON public.bottle_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_bottle_movement();

-- ============================================================
-- 7. updated_at touch triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_sm_touch ON public.shop_modules;
CREATE TRIGGER trg_sm_touch BEFORE UPDATE ON public.shop_modules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_bt_touch ON public.bottle_types;
CREATE TRIGGER trg_bt_touch BEFORE UPDATE ON public.bottle_types
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();