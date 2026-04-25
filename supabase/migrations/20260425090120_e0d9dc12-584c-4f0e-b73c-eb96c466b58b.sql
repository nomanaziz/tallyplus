-- 1. Add max_shops column
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_shops INTEGER NOT NULL DEFAULT 1;

-- 2. Backfill sensible defaults based on price
UPDATE public.subscription_plans
SET max_shops = CASE
  WHEN price_bdt <= 0 THEN 1
  WHEN price_bdt < 500 THEN 3
  WHEN price_bdt < 1500 THEN 5
  ELSE 10
END
WHERE max_shops = 1;

-- 3. Helper: get user's current shop limit (active subscription's max_shops, default 1)
CREATE OR REPLACE FUNCTION public.user_shop_limit(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT sp.max_shops
       FROM public.subscriptions s
       JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = _user_id
        AND s.status = 'active'
        AND s.expires_at > now()
      ORDER BY sp.max_shops DESC
      LIMIT 1),
    1
  )
$$;

-- 4. Helper: count user's active (non-deleted) shops
CREATE OR REPLACE FUNCTION public.user_active_shop_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.shops
  WHERE owner_id = _user_id AND deleted_at IS NULL
$$;

-- 5. Trigger to enforce limit on shop INSERT
CREATE OR REPLACE FUNCTION public.tg_enforce_shop_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_count int;
BEGIN
  v_limit := public.user_shop_limit(NEW.owner_id);
  v_count := public.user_active_shop_count(NEW.owner_id);
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'shop_limit_exceeded: You have reached your plan limit of % shops. Please upgrade your subscription to add more.', v_limit
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS enforce_shop_limit ON public.shops;
CREATE TRIGGER enforce_shop_limit
  BEFORE INSERT ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_enforce_shop_limit();