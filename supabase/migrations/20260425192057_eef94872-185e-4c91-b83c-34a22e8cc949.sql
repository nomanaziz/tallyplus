-- Fix marketplace_listings.product_id to reference the shop's products table
ALTER TABLE public.marketplace_listings
  DROP CONSTRAINT IF EXISTS marketplace_listings_product_id_fkey;

ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;