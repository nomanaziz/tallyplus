CREATE OR REPLACE FUNCTION public.my_account_resolve()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_consumer boolean := false;
  v_has_profile boolean := false;
  v_owns_shop boolean := false;
  v_is_member boolean := false;
  v_shops jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'is_consumer', false,
      'has_profile', false,
      'owns_shop', false,
      'is_member', false,
      'shops', '[]'::jsonb
    );
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.consumer_profiles WHERE id = v_uid) INTO v_is_consumer;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_uid) INTO v_has_profile;
  SELECT EXISTS(SELECT 1 FROM public.shops WHERE owner_id = v_uid AND deleted_at IS NULL) INTO v_owns_shop;
  SELECT EXISTS(SELECT 1 FROM public.shop_members WHERE user_id = v_uid) INTO v_is_member;

  SELECT COALESCE(jsonb_agg(row_to_json(s) ORDER BY s.created_at), '[]'::jsonb) INTO v_shops
  FROM (
    SELECT id, name, slug, logo_url, address, phone, currency, shop_type_code, owner_id, created_at
    FROM public.shops
    WHERE deleted_at IS NULL
      AND (
        owner_id = v_uid
        OR id IN (SELECT shop_id FROM public.shop_members WHERE user_id = v_uid)
      )
    ORDER BY created_at ASC
  ) s;

  RETURN jsonb_build_object(
    'authenticated', true,
    'is_consumer', v_is_consumer,
    'has_profile', v_has_profile,
    'owns_shop', v_owns_shop,
    'is_member', v_is_member,
    'shops', v_shops
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.my_account_resolve() TO authenticated;