
CREATE TABLE public.purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  purchase_id uuid,
  supplier_id uuid,
  return_no text,
  reason text,
  reason_note text,
  total numeric NOT NULL DEFAULT 0,
  refund_amount numeric NOT NULL DEFAULT 0,
  refund_method payment_method NOT NULL DEFAULT 'cash',
  refund_status text NOT NULL DEFAULT 'received',
  restock boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX purchase_returns_shop_idx ON public.purchase_returns(shop_id, created_at DESC);
CREATE INDEX purchase_returns_purchase_idx ON public.purchase_returns(purchase_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_returns TO authenticated;
GRANT ALL ON public.purchase_returns TO service_role;

ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preturns read shop" ON public.purchase_returns
  FOR SELECT USING (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()));
CREATE POLICY "preturns write shop" ON public.purchase_returns
  FOR ALL USING (is_shop_member(auth.uid(), shop_id))
  WITH CHECK (is_shop_member(auth.uid(), shop_id));

CREATE TRIGGER purchase_returns_set_updated_at
  BEFORE UPDATE ON public.purchase_returns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  product_id uuid,
  name text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX purchase_return_items_return_idx ON public.purchase_return_items(return_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_return_items TO authenticated;
GRANT ALL ON public.purchase_return_items TO service_role;

ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preturn items read shop" ON public.purchase_return_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.purchase_returns r
    WHERE r.id = purchase_return_items.return_id
      AND (is_shop_member(auth.uid(), r.shop_id) OR is_admin(auth.uid()))
  ));
CREATE POLICY "preturn items write shop" ON public.purchase_return_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.purchase_returns r
    WHERE r.id = purchase_return_items.return_id
      AND is_shop_member(auth.uid(), r.shop_id)
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_returns r
    WHERE r.id = purchase_return_items.return_id
      AND is_shop_member(auth.uid(), r.shop_id)
  ));
