-- Auto-seed default delivery zones for every shop
CREATE OR REPLACE FUNCTION public.tg_shop_seed_delivery_zones()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.shop_delivery_zones (shop_id, name, charge, sort_order, is_active)
  VALUES
    (NEW.id, 'ঢাকার ভিতরে', 60, 1, true),
    (NEW.id, 'ঢাকার বাহিরে', 130, 2, true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shops_seed_delivery_zones ON public.shops;
CREATE TRIGGER shops_seed_delivery_zones
AFTER INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.tg_shop_seed_delivery_zones();

-- Backfill existing shops that have no zones yet
INSERT INTO public.shop_delivery_zones (shop_id, name, charge, sort_order, is_active)
SELECT s.id, 'ঢাকার ভিতরে', 60, 1, true
FROM public.shops s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.shop_delivery_zones z WHERE z.shop_id = s.id);

INSERT INTO public.shop_delivery_zones (shop_id, name, charge, sort_order, is_active)
SELECT s.id, 'ঢাকার বাহিরে', 130, 2, true
FROM public.shops s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.shop_delivery_zones z WHERE z.shop_id = s.id AND z.name = 'ঢাকার বাহিরে');

-- Public read access to active delivery zones (so checkout can fetch them anonymously)
DROP POLICY IF EXISTS "zones public read active" ON public.shop_delivery_zones;
CREATE POLICY "zones public read active"
ON public.shop_delivery_zones
FOR SELECT
TO anon, authenticated
USING (is_active = true);