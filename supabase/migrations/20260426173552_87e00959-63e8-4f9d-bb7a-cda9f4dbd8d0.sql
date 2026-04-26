-- Index for fast unread-count lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

-- Helper: insert notification rows for every member/owner of a shop
CREATE OR REPLACE FUNCTION public.notify_shop_members(
  _shop_id uuid,
  _title text,
  _body text,
  _link text,
  _type text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- shop owner
  INSERT INTO public.notifications (user_id, title, body, link, type)
  SELECT s.owner_id, _title, _body, _link, _type
  FROM public.shops s
  WHERE s.id = _shop_id AND s.owner_id IS NOT NULL;

  -- shop members (if table exists with these columns)
  INSERT INTO public.notifications (user_id, title, body, link, type)
  SELECT m.user_id, _title, _body, _link, _type
  FROM public.shop_members m
  WHERE m.shop_id = _shop_id
    AND m.user_id IS NOT NULL
    AND m.user_id NOT IN (SELECT s.owner_id FROM public.shops s WHERE s.id = _shop_id AND s.owner_id IS NOT NULL);
END;
$$;

-- Trigger: new customer wishlist (ফর্দ)
CREATE OR REPLACE FUNCTION public.tg_notify_new_wishlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_shop_members(
    NEW.shop_id,
    'নতুন গ্রাহক ফর্দ — ' || COALESCE(NEW.customer_name, 'অজানা গ্রাহক'),
    COALESCE(NEW.customer_phone, '') || COALESCE(' • ' || NEW.note, ''),
    '/app/customer-wishlist',
    'wishlist'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_notify_new_wishlist ON public.customer_wishlists;
CREATE TRIGGER tg_notify_new_wishlist
AFTER INSERT ON public.customer_wishlists
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_wishlist();

-- Trigger: new online shop order
CREATE OR REPLACE FUNCTION public.tg_notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_shop_members(
    NEW.shop_id,
    'নতুন অর্ডার — ' || COALESCE(NEW.customer_name, 'অজানা গ্রাহক'),
    'ফোন: ' || COALESCE(NEW.customer_phone, '') || ' • মোট ৳' || COALESCE(NEW.total::text, '0'),
    '/app/online-shop/orders',
    'order'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_notify_new_order ON public.marketplace_orders;
CREATE TRIGGER tg_notify_new_order
AFTER INSERT ON public.marketplace_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_order();