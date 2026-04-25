
CREATE TABLE public.sale_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  sale_id uuid,
  customer_id uuid,
  return_no text,
  reason text,
  reason_note text,
  total numeric NOT NULL DEFAULT 0,
  refund_amount numeric NOT NULL DEFAULT 0,
  refund_method payment_method NOT NULL DEFAULT 'cash',
  refund_status text NOT NULL DEFAULT 'pending',
  restock boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX sale_returns_shop_idx ON public.sale_returns(shop_id, created_at DESC);
CREATE INDEX sale_returns_sale_idx ON public.sale_returns(sale_id);

ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "returns read shop" ON public.sale_returns
  FOR SELECT USING (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()));
CREATE POLICY "returns write shop" ON public.sale_returns
  FOR ALL USING (is_shop_member(auth.uid(), shop_id))
  WITH CHECK (is_shop_member(auth.uid(), shop_id));

CREATE TRIGGER sale_returns_set_updated_at
  BEFORE UPDATE ON public.sale_returns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.sale_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
  product_id uuid,
  name text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sale_return_items_return_idx ON public.sale_return_items(return_id);

ALTER TABLE public.sale_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "return items read shop" ON public.sale_return_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.sale_returns r
    WHERE r.id = sale_return_items.return_id
      AND (is_shop_member(auth.uid(), r.shop_id) OR is_admin(auth.uid()))
  ));
CREATE POLICY "return items write shop" ON public.sale_return_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.sale_returns r
    WHERE r.id = sale_return_items.return_id
      AND is_shop_member(auth.uid(), r.shop_id)
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.sale_returns r
    WHERE r.id = sale_return_items.return_id
      AND is_shop_member(auth.uid(), r.shop_id)
  ));
