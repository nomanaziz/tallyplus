
-- Allow consumers to read shops they have orders with (so the orders page can show shop name/logo)
CREATE POLICY "shops read by consumer with order"
ON public.shops
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_orders mo
    WHERE mo.shop_id = shops.id AND mo.consumer_user_id = auth.uid()
  )
);

-- Allow consumers to read shops they have favourited
CREATE POLICY "shops read by consumer favourite"
ON public.shops
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.consumer_favourite_shops f
    WHERE f.shop_id = shops.id AND f.consumer_id = auth.uid()
  )
);
