ALTER TABLE public.customer_wishlists
  ADD COLUMN IF NOT EXISTS allow_public_check boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_shared_fordo(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wl record;
  v_items jsonb;
  v_shop jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_wl
  FROM public.customer_wishlists
  WHERE share_token = _token
    AND share_enabled = true
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_wl IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(i) ORDER BY i.position, i.created_at), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT id, name, qty, unit, price, fulfillment_status, done, position, shopkeeper_note
    FROM public.customer_wishlist_items
    WHERE wishlist_id = v_wl.id
  ) i;

  SELECT to_jsonb(s) INTO v_shop
  FROM (
    SELECT id, name, logo_url
    FROM public.shops
    WHERE id = v_wl.shop_id AND deleted_at IS NULL
  ) s;

  RETURN jsonb_build_object(
    'ok', true,
    'wishlist', jsonb_build_object(
      'id', v_wl.id,
      'customer_name', v_wl.customer_name,
      'customer_phone', v_wl.customer_phone,
      'customer_address', v_wl.customer_address,
      'note', v_wl.note,
      'status', v_wl.status,
      'created_at', v_wl.created_at,
      'share_token', v_wl.share_token,
      'allow_public_check', v_wl.allow_public_check
    ),
    'items', v_items,
    'shop', v_shop
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_shared_fordo_item(_token text, _item_id uuid, _done boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wl record;
BEGIN
  IF _token IS NULL OR length(_token) < 6 OR _item_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  SELECT id, allow_public_check INTO v_wl
  FROM public.customer_wishlists
  WHERE share_token = _token
    AND share_enabled = true
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_wl IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF NOT v_wl.allow_public_check THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_allowed');
  END IF;

  UPDATE public.customer_wishlist_items
    SET done = COALESCE(_done, false)
    WHERE id = _item_id AND wishlist_id = v_wl.id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'item_not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;