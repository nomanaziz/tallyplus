
-- owner_transactions
CREATE TABLE public.owner_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('invest','withdraw')),
  amount numeric NOT NULL CHECK (amount >= 0),
  note text,
  paid_via public.payment_method NOT NULL DEFAULT 'cash',
  tx_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_owner_tx_shop_date ON public.owner_transactions(shop_id, tx_date DESC) WHERE deleted_at IS NULL;
ALTER TABLE public.owner_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_tx read shop" ON public.owner_transactions FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
CREATE POLICY "owner_tx write shop" ON public.owner_transactions FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE TRIGGER owner_tx_set_updated BEFORE UPDATE ON public.owner_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- assets
CREATE TABLE public.assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  purchase_price numeric NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  paid_via public.payment_method NOT NULL DEFAULT 'cash',
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','damaged','sold','disposed')),
  disposed_at date,
  disposed_value numeric NOT NULL DEFAULT 0 CHECK (disposed_value >= 0),
  note text,
  image_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_assets_shop_status ON public.assets(shop_id, status) WHERE deleted_at IS NULL;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets read shop" ON public.assets FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
CREATE POLICY "assets write shop" ON public.assets FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE TRIGGER assets_set_updated BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
