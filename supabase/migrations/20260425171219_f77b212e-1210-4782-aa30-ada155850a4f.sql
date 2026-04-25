-- Add columns for messaging and card shape
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS facebook_page_id text,
  ADD COLUMN IF NOT EXISTS theme_card_shape text NOT NULL DEFAULT 'square';

-- Marketplace orders
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  order_no text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  payment_method text DEFAULT 'cash',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  listing_id uuid,
  product_id uuid,
  name text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mp_orders_shop ON public.marketplace_orders(shop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_order_items_order ON public.marketplace_order_items(order_id);

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mp_orders shop read" ON public.marketplace_orders
  FOR SELECT USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
CREATE POLICY "mp_orders shop write" ON public.marketplace_orders
  FOR ALL USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "mp_orders public insert" ON public.marketplace_orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "mp_order_items read" ON public.marketplace_order_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND (public.is_shop_member(auth.uid(), o.shop_id) OR public.is_admin(auth.uid()))));
CREATE POLICY "mp_order_items write" ON public.marketplace_order_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND public.is_shop_member(auth.uid(), o.shop_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND public.is_shop_member(auth.uid(), o.shop_id)));
CREATE POLICY "mp_order_items public insert" ON public.marketplace_order_items
  FOR INSERT WITH CHECK (true);

CREATE TRIGGER mp_orders_updated_at BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();