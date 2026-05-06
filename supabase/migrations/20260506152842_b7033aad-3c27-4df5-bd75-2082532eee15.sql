-- Shop limit overrides on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shop_limit_override integer,
  ADD COLUMN IF NOT EXISTS unlimited_shops boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.user_shop_limit(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_unlimited boolean;
  v_override int;
  v_plan_max int;
BEGIN
  SELECT unlimited_shops, shop_limit_override
    INTO v_unlimited, v_override
    FROM public.profiles WHERE id = _user_id;

  IF v_unlimited THEN RETURN 9999; END IF;
  IF v_override IS NOT NULL AND v_override > 0 THEN RETURN v_override; END IF;

  SELECT sp.max_shops INTO v_plan_max
    FROM public.subscriptions s
    JOIN public.subscription_plans sp ON sp.id = s.plan_id
   WHERE s.user_id = _user_id
     AND s.status IN ('active','trial')
     AND s.expires_at > now()
   ORDER BY sp.max_shops DESC
   LIMIT 1;

  RETURN COALESCE(v_plan_max, 1);
END
$function$;

INSERT INTO public.subscription_plans (code, name_bn, name_en, price_bdt, duration_days, max_shops, is_active)
SELECT 'lifetime', 'লাইফটাইম (অ্যাডমিন গিফট)', 'Lifetime (Admin Gift)', 0, 3650, 9999, false
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE code = 'lifetime');

CREATE OR REPLACE FUNCTION public.admin_grant_access(
  _user_id uuid,
  _plan_id uuid,
  _duration_days int,
  _shop_limit int,
  _unlimited_shops boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_plan record;
  v_days int;
  v_sub_id uuid;
BEGIN
  IF v_caller IS NULL OR NOT public.is_admin(v_caller) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _user_id IS NULL OR _plan_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = _plan_id LIMIT 1;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'plan_not_found'; END IF;

  v_days := COALESCE(NULLIF(_duration_days, 0), v_plan.duration_days, 30);
  IF v_days < 1 THEN v_days := 1; END IF;
  IF v_days > 36500 THEN v_days := 36500; END IF;

  UPDATE public.subscriptions
     SET status = 'expired', updated_at = now()
   WHERE user_id = _user_id
     AND status IN ('active','trial')
     AND expires_at > now();

  INSERT INTO public.subscriptions(user_id, plan_id, starts_at, expires_at, status)
  VALUES (_user_id, _plan_id, now(), now() + (v_days || ' days')::interval, 'active')
  RETURNING id INTO v_sub_id;

  UPDATE public.profiles
     SET shop_limit_override = CASE WHEN _unlimited_shops THEN NULL
                                    WHEN _shop_limit IS NOT NULL AND _shop_limit > 0 THEN _shop_limit
                                    ELSE NULL END,
         unlimited_shops = COALESCE(_unlimited_shops, false),
         updated_at = now()
   WHERE id = _user_id;

  RETURN jsonb_build_object('ok', true, 'subscription_id', v_sub_id, 'expires_in_days', v_days);
END
$function$;

CREATE OR REPLACE FUNCTION public.admin_revoke_access(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL OR NOT public.is_admin(v_caller) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'invalid_input'; END IF;

  UPDATE public.subscriptions
     SET status = 'expired', updated_at = now()
   WHERE user_id = _user_id
     AND status IN ('active','trial')
     AND expires_at > now();

  UPDATE public.profiles
     SET shop_limit_override = NULL,
         unlimited_shops = false,
         updated_at = now()
   WHERE id = _user_id;

  RETURN jsonb_build_object('ok', true);
END
$function$;