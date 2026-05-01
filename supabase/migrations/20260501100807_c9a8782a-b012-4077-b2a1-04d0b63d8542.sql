-- Fix marketplace_listings.product_id FK to point at marketplace_products
-- Existing rows reference products(id) which is incorrect per the app's data model.
-- Remove orphan rows that don't match marketplace_products, then re-add the FK.

ALTER TABLE public.marketplace_listings
  DROP CONSTRAINT IF EXISTS marketplace_listings_product_id_fkey;

DELETE FROM public.marketplace_listings
WHERE product_id NOT IN (SELECT id FROM public.marketplace_products);

ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.marketplace_products(id) ON DELETE CASCADE;