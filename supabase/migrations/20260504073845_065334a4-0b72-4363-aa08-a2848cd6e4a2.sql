-- Quotations
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  quote_no text NOT NULL,
  customer_name text,
  customer_phone text,
  customer_address text,
  valid_until date,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  delivery numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  note text,
  status text NOT NULL DEFAULT 'draft',
  converted_sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_quotations_shop ON public.quotations(shop_id);
CREATE INDEX idx_quotations_customer ON public.quotations(customer_id);
CREATE INDEX idx_quotations_quote_no ON public.quotations(quote_no);

CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  qty numeric NOT NULL DEFAULT 1,
  unit text,
  price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotation_items_quotation ON public.quotation_items(quotation_id);

-- Updated_at trigger
CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view quotations"
  ON public.quotations FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Shop members can insert quotations"
  ON public.quotations FOR INSERT
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop members can update quotations"
  ON public.quotations FOR UPDATE
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop members can delete quotations"
  ON public.quotations FOR DELETE
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop members can view quotation items"
  ON public.quotation_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_items.quotation_id
        AND (public.is_shop_member(auth.uid(), q.shop_id) OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Shop members can insert quotation items"
  ON public.quotation_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_items.quotation_id
        AND public.is_shop_member(auth.uid(), q.shop_id)
    )
  );

CREATE POLICY "Shop members can update quotation items"
  ON public.quotation_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_items.quotation_id
        AND public.is_shop_member(auth.uid(), q.shop_id)
    )
  );

CREATE POLICY "Shop members can delete quotation items"
  ON public.quotation_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_items.quotation_id
        AND public.is_shop_member(auth.uid(), q.shop_id)
    )
  );