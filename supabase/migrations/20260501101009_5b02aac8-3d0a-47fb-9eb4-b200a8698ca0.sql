-- Revert FK: marketplace_listings.product_id references shop products(id)
ALTER TABLE public.marketplace_listings
  DROP CONSTRAINT IF EXISTS marketplace_listings_product_id_fkey;

ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- Backfill listing rows for every product currently marked is_marketplace_published
INSERT INTO public.marketplace_listings (product_id, shop_id, seller_id, price, stock, unit, is_published)
SELECT
  p.id,
  p.shop_id,
  COALESCE(s.owner_id, p.shop_id),
  COALESCE(p.sale_price, 0),
  COALESCE(p.stock, 0),
  COALESCE(p.unit, 'pcs'),
  true
FROM public.products p
JOIN public.shops s ON s.id = p.shop_id
WHERE p.is_marketplace_published = true
  AND p.deleted_at IS NULL
ON CONFLICT (product_id, shop_id) DO UPDATE
SET is_published = true,
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    unit = EXCLUDED.unit,
    updated_at = now();

-- Make sure the parent shops are marketplace_enabled
UPDATE public.shops s
SET marketplace_enabled = true
WHERE s.id IN (
  SELECT DISTINCT shop_id FROM public.products WHERE is_marketplace_published = true AND deleted_at IS NULL
)
AND COALESCE(s.marketplace_enabled, false) = false;