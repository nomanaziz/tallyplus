-- Fast aggregated account info: profile + admin flag + active subscription in one round-trip
CREATE OR REPLACE FUNCTION public.my_account()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile jsonb;
  v_is_admin boolean;
  v_sub jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('profile', NULL, 'is_admin', false, 'subscription', NULL);
  END IF;

  SELECT to_jsonb(p) INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_uid;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'admin')
    INTO v_is_admin;

  SELECT to_jsonb(s) INTO v_sub
  FROM public.subscriptions s
  WHERE s.user_id = v_uid AND s.status = 'active' AND s.expires_at > now()
  ORDER BY s.expires_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'is_admin', COALESCE(v_is_admin, false),
    'subscription', v_sub
  );
END $$;

GRANT EXECUTE ON FUNCTION public.my_account() TO authenticated;

-- Fast aggregated shop permissions: owner/admin/member/custom-role in one round-trip
CREATE OR REPLACE FUNCTION public.my_shop_perms(_shop_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_owner boolean;
  v_member_role text;
  v_member_perms jsonb;
  v_custom_perms jsonb;
BEGIN
  IF v_uid IS NULL OR _shop_id IS NULL THEN
    RETURN jsonb_build_object('is_admin', false, 'is_owner', false, 'role', NULL, 'permissions', NULL);
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'admin')
    INTO v_is_admin;

  SELECT EXISTS(SELECT 1 FROM public.shops WHERE id = _shop_id AND owner_id = v_uid)
    INTO v_is_owner;

  IF NOT v_is_owner AND NOT v_is_admin THEN
    SELECT m.role::text, m.permissions, cr.permissions
      INTO v_member_role, v_member_perms, v_custom_perms
    FROM public.shop_members m
    LEFT JOIN public.shop_custom_roles cr ON cr.id = m.custom_role_id
    WHERE m.shop_id = _shop_id AND m.user_id = v_uid
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'is_admin', COALESCE(v_is_admin, false),
    'is_owner', COALESCE(v_is_owner, false),
    'role', v_member_role,
    'permissions', COALESCE(v_member_perms, v_custom_perms)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.my_shop_perms(uuid) TO authenticated;