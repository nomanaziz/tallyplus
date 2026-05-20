
DROP POLICY IF EXISTS "seller_locations public lpg marketplace" ON public.seller_locations;
CREATE POLICY "seller_locations public lpg marketplace" ON public.seller_locations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = seller_locations.shop_id AND s.list_in_lpg_marketplace = true));
