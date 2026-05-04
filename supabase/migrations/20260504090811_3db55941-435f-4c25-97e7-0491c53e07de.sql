-- ============================================================
-- 1) Update plan helpers to recognize 'trial' status as active
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_active_plan_code(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT sp.code
       FROM public.subscriptions s
       JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = _user_id
        AND s.status IN ('active','trial')
        AND s.expires_at > now()
      ORDER BY s.expires_at DESC
      LIMIT 1),
    'free'
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.subscriptions
    where user_id = _user_id
      and status IN ('active','trial')
      and expires_at > now()
  )
$function$;

CREATE OR REPLACE FUNCTION public.user_shop_limit(_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT sp.max_shops
       FROM public.subscriptions s
       JOIN public.subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = _user_id
        AND s.status IN ('active','trial')
        AND s.expires_at > now()
      ORDER BY sp.max_shops DESC
      LIMIT 1),
    1
  )
$function$;

-- ============================================================
-- 2) Helper: grant a trial subscription to a user (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_trial_subscription(_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settings record;
  v_plan_id uuid;
  v_existing uuid;
  v_new_id uuid;
BEGIN
  -- Read settings
  SELECT * INTO v_settings FROM public.trial_settings WHERE id = true LIMIT 1;
  IF v_settings IS NULL OR NOT v_settings.is_enabled THEN
    RETURN NULL;
  END IF;

  -- Skip if user already has any subscription (paid, trial, expired)
  SELECT id INTO v_existing FROM public.subscriptions WHERE user_id = _user_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_plan_id FROM public.subscription_plans WHERE code = 'trial' LIMIT 1;
  IF v_plan_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.subscriptions(user_id, plan_id, starts_at, expires_at, status)
  VALUES (_user_id, v_plan_id, now(), now() + (v_settings.duration_days || ' days')::interval, 'trial')
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$;

-- ============================================================
-- 3) Update handle_new_user to grant trial for owners
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_account_type text := coalesce(new.raw_user_meta_data->>'account_type', 'owner');
  v_full_name text := coalesce(new.raw_user_meta_data->>'full_name', '');
begin
  if v_account_type = 'consumer' then
    insert into public.consumer_profiles (id, name, phone)
      values (new.id, v_full_name, coalesce(new.phone, ''))
      on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'consumer') on conflict do nothing;
  else
    insert into public.profiles (id, phone, full_name)
      values (new.id, new.phone, v_full_name)
      on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'owner') on conflict do nothing;
    -- Grant free trial automatically (no-op if already exists or trial disabled)
    PERFORM public.grant_trial_subscription(new.id);
  end if;
  return new;
end;
$function$;

-- ============================================================
-- 4) Backfill: give a trial to existing owners who have NO subscription
--    Trial countdown starts from now (so existing users get a fresh chance).
-- ============================================================
DO $$
DECLARE
  v_settings record;
  v_plan_id uuid;
  r record;
BEGIN
  SELECT * INTO v_settings FROM public.trial_settings WHERE id = true LIMIT 1;
  IF v_settings IS NULL OR NOT v_settings.is_enabled THEN RETURN; END IF;
  SELECT id INTO v_plan_id FROM public.subscription_plans WHERE code = 'trial' LIMIT 1;
  IF v_plan_id IS NULL THEN RETURN; END IF;

  FOR r IN
    SELECT p.id AS user_id
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id)
  LOOP
    INSERT INTO public.subscriptions(user_id, plan_id, starts_at, expires_at, status)
    VALUES (r.user_id, v_plan_id, now(), now() + (v_settings.duration_days || ' days')::interval, 'trial');
  END LOOP;
END $$;

-- ============================================================
-- 5) Daily cleanup: mark expired trials/active subscriptions as expired
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_old_subscriptions()
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count int;
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status IN ('active','trial') AND expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('expire-old-subscriptions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-old-subscriptions',
  '0 * * * *', -- hourly
  $$ SELECT public.expire_old_subscriptions(); $$
);
