-- Add services row to usage_limits for each plan
INSERT INTO public.usage_limits (plan_code, feature_key, limit_count) VALUES
  ('free', 'services', 5),
  ('monthly', 'services', -1),
  ('yearly', 'services', -1),
  ('lifetime', 'services', -1)
ON CONFLICT (plan_code, feature_key) DO UPDATE SET limit_count = EXCLUDED.limit_count;

-- Helper: returns active plan code for a user (falls back to 'free')
CREATE OR REPLACE FUNCTION public.user_active_plan_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT sp.code
       FROM public.subscriptions s
       JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = _user_id
        AND s.status = 'active'
        AND s.expires_at > now()
      ORDER BY s.expires_at DESC
      LIMIT 1),
    'free'
  );
$$;

-- Public RPC: returns { allowed, used, limit, plan_code } for the current user/shop/feature
CREATE OR REPLACE FUNCTION public.check_usage_limit(_shop_id uuid, _feature text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_plan text;
  v_limit int;
  v_used int := 0;
BEGIN
  SELECT owner_id INTO v_owner FROM public.shops WHERE id = _shop_id;
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'used', 0, 'limit', -1, 'plan_code', 'free');
  END IF;
  v_plan := public.user_active_plan_code(v_owner);
  SELECT limit_count INTO v_limit
    FROM public.usage_limits
    WHERE plan_code = v_plan AND feature_key = _feature
    LIMIT 1;
  IF v_limit IS NULL THEN v_limit := -1; END IF;

  IF _feature = 'products' THEN
    SELECT COUNT(*) INTO v_used FROM public.products WHERE shop_id = _shop_id AND deleted_at IS NULL;
  ELSIF _feature = 'services' THEN
    SELECT COUNT(*) INTO v_used FROM public.services WHERE shop_id = _shop_id AND deleted_at IS NULL;
  ELSIF _feature = 'sale' THEN
    SELECT COUNT(*) INTO v_used FROM public.sales WHERE shop_id = _shop_id AND deleted_at IS NULL;
  ELSIF _feature = 'purchase' THEN
    SELECT COUNT(*) INTO v_used FROM public.purchases WHERE shop_id = _shop_id AND deleted_at IS NULL;
  ELSIF _feature = 'expense' THEN
    SELECT COUNT(*) INTO v_used FROM public.expenses WHERE shop_id = _shop_id AND deleted_at IS NULL;
  ELSIF _feature = 'contacts_customer' THEN
    SELECT COUNT(*) INTO v_used FROM public.customers WHERE shop_id = _shop_id AND deleted_at IS NULL;
  ELSIF _feature = 'contacts_supplier' THEN
    SELECT COUNT(*) INTO v_used FROM public.suppliers WHERE shop_id = _shop_id AND deleted_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'allowed', (v_limit = -1 OR v_used < v_limit),
    'used', v_used,
    'limit', v_limit,
    'plan_code', v_plan
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_usage_limit(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_active_plan_code(uuid) TO authenticated;

-- Trigger function: enforce limit on insert
CREATE OR REPLACE FUNCTION public.tg_enforce_usage_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feature text := TG_ARGV[0];
  v_owner uuid;
  v_plan text;
  v_limit int;
  v_used int := 0;
BEGIN
  SELECT owner_id INTO v_owner FROM public.shops WHERE id = NEW.shop_id;
  IF v_owner IS NULL THEN RETURN NEW; END IF;
  v_plan := public.user_active_plan_code(v_owner);
  SELECT limit_count INTO v_limit
    FROM public.usage_limits
    WHERE plan_code = v_plan AND feature_key = v_feature
    LIMIT 1;
  IF v_limit IS NULL OR v_limit = -1 THEN RETURN NEW; END IF;

  IF v_feature = 'products' THEN
    SELECT COUNT(*) INTO v_used FROM public.products WHERE shop_id = NEW.shop_id AND deleted_at IS NULL;
  ELSIF v_feature = 'services' THEN
    SELECT COUNT(*) INTO v_used FROM public.services WHERE shop_id = NEW.shop_id AND deleted_at IS NULL;
  END IF;

  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'limit_reached: %:%', v_feature, v_limit
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_enforce_free_limit_products ON public.products;
CREATE TRIGGER tg_enforce_free_limit_products
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_usage_limit('products');

DROP TRIGGER IF EXISTS tg_enforce_free_limit_services ON public.services;
CREATE TRIGGER tg_enforce_free_limit_services
  BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_usage_limit('services');