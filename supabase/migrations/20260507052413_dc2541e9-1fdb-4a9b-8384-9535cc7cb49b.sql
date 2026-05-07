ALTER TABLE public.shop_members ADD COLUMN IF NOT EXISTS is_all_shops boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.tg_shops_propagate_all_shops_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.shop_members (shop_id, user_id, role, permissions, custom_role_id, full_name, email, address, avatar_url, is_all_shops)
  SELECT DISTINCT ON (m.user_id) NEW.id, m.user_id, m.role, m.permissions, m.custom_role_id, m.full_name, m.email, m.address, m.avatar_url, true
  FROM public.shop_members m
  JOIN public.shops s ON s.id = m.shop_id
  WHERE s.owner_id = NEW.owner_id
    AND s.id <> NEW.id
    AND m.is_all_shops = true
  ORDER BY m.user_id, m.created_at DESC
  ON CONFLICT (shop_id, user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS shops_propagate_all_shops_members ON public.shops;
CREATE TRIGGER shops_propagate_all_shops_members
AFTER INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.tg_shops_propagate_all_shops_members();