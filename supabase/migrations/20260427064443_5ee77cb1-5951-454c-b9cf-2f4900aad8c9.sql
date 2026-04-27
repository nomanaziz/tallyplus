-- 1) Customer reminder log
CREATE TABLE public.customer_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms')),
  amount numeric NOT NULL DEFAULT 0,
  message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rem_log read shop" ON public.customer_reminder_log FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
CREATE POLICY "rem_log write shop" ON public.customer_reminder_log FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE INDEX idx_rem_log_shop_customer ON public.customer_reminder_log (shop_id, customer_id, created_at DESC);

-- 2) Serial status enum + product_serials table
DO $$ BEGIN
  CREATE TYPE public.serial_status AS ENUM ('in_stock','sold','returned','damaged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.product_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  serial_no text NOT NULL,
  imei2 text,
  status public.serial_status NOT NULL DEFAULT 'in_stock',
  cost_price numeric NOT NULL DEFAULT 0,
  warranty_until date,
  sale_id uuid,
  sale_item_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, serial_no)
);
ALTER TABLE public.product_serials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ps read shop" ON public.product_serials FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ps write shop" ON public.product_serials FOR ALL
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

CREATE INDEX idx_ps_product ON public.product_serials (product_id);
CREATE INDEX idx_ps_shop_status ON public.product_serials (shop_id, status);

CREATE TRIGGER trg_ps_updated_at
  BEFORE UPDATE ON public.product_serials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3) products.is_serialized flag
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_serialized boolean NOT NULL DEFAULT false;

-- 4) sale_items.serial_id
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS serial_id uuid;

CREATE INDEX IF NOT EXISTS idx_sale_items_serial ON public.sale_items (serial_id);