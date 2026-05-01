-- Extend my_account() to include is_owner so frontend can route Home to the correct dashboard.
CREATE OR REPLACE FUNCTION public.my_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_profile jsonb;
  v_is_admin boolean;
  v_is_owner boolean;
  v_sub jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('profile', NULL, 'is_admin', false, 'is_owner', false, 'subscription', NULL);
  END IF;

  SELECT to_jsonb(p) INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_uid;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'admin')
    INTO v_is_admin;

  SELECT EXISTS(SELECT 1 FROM public.shops WHERE owner_id = v_uid)
    INTO v_is_owner;

  SELECT to_jsonb(s) INTO v_sub
  FROM public.subscriptions s
  WHERE s.user_id = v_uid AND s.status = 'active' AND s.expires_at > now()
  ORDER BY s.expires_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'is_admin', COALESCE(v_is_admin, false),
    'is_owner', COALESCE(v_is_owner, false),
    'subscription', v_sub
  );
END $function$;