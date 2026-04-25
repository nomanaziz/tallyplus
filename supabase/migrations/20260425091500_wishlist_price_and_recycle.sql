-- Add price column to wishlist items
ALTER TABLE public.customer_wishlist_items
  ADD COLUMN IF NOT EXISTS price numeric;

-- Add soft-delete column to customer_wishlists
ALTER TABLE public.customer_wishlists
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Allow INSERT for wishlists/items (was previously restricted)
DROP POLICY IF EXISTS "wishlists insert shop" ON public.customer_wishlists;
CREATE POLICY "wishlists insert shop"
  ON public.customer_wishlists
  FOR INSERT
  WITH CHECK (is_shop_member(auth.uid(), shop_id));

DROP POLICY IF EXISTS "wishlist_items insert shop" ON public.customer_wishlist_items;
CREATE POLICY "wishlist_items insert shop"
  ON public.customer_wishlist_items
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.customer_wishlists w
    WHERE w.id = customer_wishlist_items.wishlist_id
      AND is_shop_member(auth.uid(), w.shop_id)
  ));
