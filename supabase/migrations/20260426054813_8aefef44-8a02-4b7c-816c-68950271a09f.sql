ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_wholesale boolean NOT NULL DEFAULT false;
ALTER TABLE public.customer_wishlists ADD COLUMN IF NOT EXISTS is_b2b boolean NOT NULL DEFAULT false;
ALTER TABLE public.customer_wishlists ADD COLUMN IF NOT EXISTS buyer_shop_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_shops_is_wholesale ON public.shops(is_wholesale) WHERE is_wholesale = true;
CREATE INDEX IF NOT EXISTS idx_customer_wishlists_is_b2b ON public.customer_wishlists(shop_id, is_b2b);