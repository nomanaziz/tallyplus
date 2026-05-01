ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS consumer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mp_orders_consumer_user
  ON public.marketplace_orders (consumer_user_id);

DROP POLICY IF EXISTS "mp_orders consumer read" ON public.marketplace_orders;
CREATE POLICY "mp_orders consumer read"
  ON public.marketplace_orders
  FOR SELECT
  USING (consumer_user_id = auth.uid());

DROP POLICY IF EXISTS "mp_order_items consumer read" ON public.marketplace_order_items;
CREATE POLICY "mp_order_items consumer read"
  ON public.marketplace_order_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_orders o
    WHERE o.id = marketplace_order_items.order_id
      AND o.consumer_user_id = auth.uid()
  ));