ALTER TABLE public.customer_wishlist_items
  ADD COLUMN IF NOT EXISTS cost_price numeric NULL,
  ADD COLUMN IF NOT EXISTS profit numeric NULL;