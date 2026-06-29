
-- Authorization function for Realtime channel subscriptions
CREATE OR REPLACE FUNCTION public.can_subscribe_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _shop_id uuid;
  _target_uid uuid;
  _wl_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  -- pos-products-<shop_id>: shop members only
  IF _topic LIKE 'pos-products-%' THEN
    BEGIN
      _shop_id := substring(_topic from 'pos-products-(.*)$')::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN public.is_shop_member(_uid, _shop_id);
  END IF;

  -- notif-<user_id>: owner only
  IF _topic LIKE 'notif-%' THEN
    BEGIN
      _target_uid := substring(_topic from 'notif-(.*)$')::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN _target_uid = _uid;
  END IF;

  -- customer-dashboard-<user_id>: owner only
  IF _topic LIKE 'customer-dashboard-%' THEN
    BEGIN
      _target_uid := substring(_topic from 'customer-dashboard-(.*)$')::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN _target_uid = _uid;
  END IF;

  -- my-fordo-items-<wishlist_id>: customer who owns wishlist
  IF _topic LIKE 'my-fordo-items-%' THEN
    BEGIN
      _wl_id := substring(_topic from 'my-fordo-items-(.*)$')::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.customer_wishlists w
      WHERE w.id = _wl_id AND w.customer_user_id = _uid
    );
  END IF;

  -- shared-fordo-<wishlist_id>: any authenticated user with link can subscribe
  -- (these are publicly shared lists)
  IF _topic LIKE 'shared-fordo-%' THEN
    RETURN true;
  END IF;

  -- Default deny for any other topic
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_subscribe_realtime_topic(text) TO authenticated;

-- Enable RLS on realtime.messages and add policy
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can subscribe to authorized topics" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to authorized topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.can_subscribe_realtime_topic(realtime.topic()));
