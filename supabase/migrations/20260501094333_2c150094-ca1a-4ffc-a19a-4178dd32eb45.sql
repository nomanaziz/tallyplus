
-- ====== 1) Marketplace categories (admin-managed, with subcategory) ======
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.marketplace_categories(id) ON DELETE CASCADE,
  name_bn text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mp_cat_parent ON public.marketplace_categories(parent_id);

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketplace_categories public read" ON public.marketplace_categories;
CREATE POLICY "marketplace_categories public read"
  ON public.marketplace_categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "marketplace_categories admin write" ON public.marketplace_categories;
CREATE POLICY "marketplace_categories admin write"
  ON public.marketplace_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS tg_marketplace_categories_updated_at ON public.marketplace_categories;
CREATE TRIGGER tg_marketplace_categories_updated_at
  BEFORE UPDATE ON public.marketplace_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.marketplace_products
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.marketplace_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mp_products_category ON public.marketplace_products(category_id);
CREATE INDEX IF NOT EXISTS idx_mp_products_subcategory ON public.marketplace_products(subcategory_id);

-- ====== 2) Per-shop delivery on marketplace orders ======
ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS delivery_zone_id uuid REFERENCES public.shop_delivery_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0;

-- ====== 3) Two-device login limit ======
CREATE TABLE IF NOT EXISTS public.user_active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);
CREATE INDEX IF NOT EXISTS idx_uas_user ON public.user_active_sessions(user_id, last_seen_at DESC);

ALTER TABLE public.user_active_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uas read own" ON public.user_active_sessions;
CREATE POLICY "uas read own"
  ON public.user_active_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "uas insert own" ON public.user_active_sessions;
CREATE POLICY "uas insert own"
  ON public.user_active_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "uas update own" ON public.user_active_sessions;
CREATE POLICY "uas update own"
  ON public.user_active_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "uas delete own" ON public.user_active_sessions;
CREATE POLICY "uas delete own"
  ON public.user_active_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Helper RPC: register a device, evict oldest if > 2 active devices
CREATE OR REPLACE FUNCTION public.register_active_device(_device_id text, _user_agent text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int;
  v_max constant int := 2;
  v_evicted text[];
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  INSERT INTO public.user_active_sessions(user_id, device_id, user_agent, last_seen_at)
  VALUES (v_uid, _device_id, _user_agent, now())
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET last_seen_at = now(), user_agent = COALESCE(EXCLUDED.user_agent, user_active_sessions.user_agent);

  -- If too many devices, evict oldest until <= max
  WITH ranked AS (
    SELECT device_id, row_number() OVER (ORDER BY last_seen_at DESC) AS rn
    FROM public.user_active_sessions
    WHERE user_id = v_uid
  )
  DELETE FROM public.user_active_sessions s
  USING ranked r
  WHERE s.user_id = v_uid AND s.device_id = r.device_id AND r.rn > v_max
  RETURNING s.device_id INTO v_evicted;

  SELECT count(*) INTO v_count FROM public.user_active_sessions WHERE user_id = v_uid;
  RETURN jsonb_build_object('ok', true, 'active', v_count, 'max', v_max);
END $$;

-- Heartbeat RPC: returns whether this device is still allowed
CREATE OR REPLACE FUNCTION public.heartbeat_active_device(_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'allowed', false);
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.user_active_sessions
    WHERE user_id = v_uid AND device_id = _device_id
  ) INTO v_exists;
  IF v_exists THEN
    UPDATE public.user_active_sessions SET last_seen_at = now()
    WHERE user_id = v_uid AND device_id = _device_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'allowed', v_exists);
END $$;
