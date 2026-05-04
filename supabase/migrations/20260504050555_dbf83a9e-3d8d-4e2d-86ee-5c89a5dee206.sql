
ALTER TABLE public.customer_wishlists
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT true;

-- Backfill tokens for existing rows
UPDATE public.customer_wishlists
SET share_token = lower(regexp_replace(encode(gen_random_bytes(12), 'base64'), '[^a-zA-Z0-9]', '', 'g'))
WHERE share_token IS NULL;

-- Ensure non-empty (in case stripped string was short, append uuid)
UPDATE public.customer_wishlists
SET share_token = share_token || replace(gen_random_uuid()::text, '-', '')
WHERE length(coalesce(share_token,'')) < 12;

-- Trim to 16 chars
UPDATE public.customer_wishlists
SET share_token = substr(share_token, 1, 16)
WHERE length(share_token) > 16;

CREATE UNIQUE INDEX IF NOT EXISTS customer_wishlists_share_token_key
  ON public.customer_wishlists(share_token);

-- Trigger to auto-generate share_token on insert
CREATE OR REPLACE FUNCTION public.tg_wishlist_ensure_share_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tok text;
  v_attempt int := 0;
BEGIN
  IF NEW.share_token IS NOT NULL AND length(NEW.share_token) >= 8 THEN
    RETURN NEW;
  END IF;
  LOOP
    v_attempt := v_attempt + 1;
    v_tok := substr(
      lower(regexp_replace(encode(gen_random_bytes(12), 'base64'), '[^a-zA-Z0-9]', '', 'g')),
      1, 16
    );
    IF length(v_tok) >= 12
       AND NOT EXISTS (SELECT 1 FROM public.customer_wishlists WHERE share_token = v_tok) THEN
      NEW.share_token := v_tok;
      RETURN NEW;
    END IF;
    IF v_attempt > 10 THEN
      NEW.share_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS trg_wishlist_share_token ON public.customer_wishlists;
CREATE TRIGGER trg_wishlist_share_token
  BEFORE INSERT ON public.customer_wishlists
  FOR EACH ROW EXECUTE FUNCTION public.tg_wishlist_ensure_share_token();

-- Public RPC to fetch a fordo by share token (read-only)
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
      'share_token', v_wl.share_token
    ),
    'items', v_items,
    'shop', v_shop
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_fordo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_fordo(text) TO anon, authenticated;
