
-- 1) Permanent customer identity per shop
CREATE TABLE public.wishlist_customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL,
  phone text NOT NULL,
  name text NOT NULL,
  address text,
  pin_hash text NOT NULL,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, phone)
);

ALTER TABLE public.wishlist_customers ENABLE ROW LEVEL SECURITY;

-- Shop members can read their shop's customers; admin can read all
CREATE POLICY "wlc read shop"
  ON public.wishlist_customers FOR SELECT
  USING (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()));

-- No client write — only service role (edge functions) writes
CREATE TRIGGER wlc_set_updated BEFORE UPDATE ON public.wishlist_customers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_wlc_shop_phone ON public.wishlist_customers (shop_id, phone);

-- 2) Link wishlists to permanent customers
ALTER TABLE public.customer_wishlists
  ADD COLUMN IF NOT EXISTS wishlist_customer_id uuid;

CREATE INDEX IF NOT EXISTS idx_cw_wlc ON public.customer_wishlists (wishlist_customer_id);

-- 3) Fulfillment status per item
ALTER TABLE public.customer_wishlist_items
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS shopkeeper_note text;

-- 4) Saved templates ("মাসিক বাজার")
CREATE TABLE public.wishlist_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wishlist_customer_id uuid NOT NULL REFERENCES public.wishlist_customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wishlist_templates ENABLE ROW LEVEL SECURITY;

-- Shop members can read templates of their shop's customers
CREATE POLICY "wlt read shop"
  ON public.wishlist_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlist_customers c
      WHERE c.id = wishlist_templates.wishlist_customer_id
        AND (is_shop_member(auth.uid(), c.shop_id) OR is_admin(auth.uid()))
    )
  );

CREATE TRIGGER wlt_set_updated BEFORE UPDATE ON public.wishlist_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_wlt_customer ON public.wishlist_templates (wishlist_customer_id);
