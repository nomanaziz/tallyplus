ALTER TABLE public.customer_wishlists
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_sale_id uuid;

CREATE INDEX IF NOT EXISTS idx_customer_wishlists_shop_active
  ON public.customer_wishlists (shop_id, created_at DESC)
  WHERE deleted_at IS NULL;