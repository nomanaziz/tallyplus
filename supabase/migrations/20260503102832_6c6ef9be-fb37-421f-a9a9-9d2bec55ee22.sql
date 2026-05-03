
-- =========================================================
-- 1) payment_gateway_settings: hide sensitive `extra` from public
-- =========================================================
DROP POLICY IF EXISTS "pgs public read minimal" ON public.payment_gateway_settings;

-- Public-safe view (no `extra`, no api_url, no merchant_id)
CREATE OR REPLACE VIEW public.payment_gateway_status
WITH (security_invoker = on) AS
SELECT id, provider, is_enabled, updated_at
FROM public.payment_gateway_settings;

GRANT SELECT ON public.payment_gateway_status TO anon, authenticated;

-- Allow the view to read the base table even though SELECT is admin-only
CREATE POLICY "pgs status view read"
ON public.payment_gateway_settings
FOR SELECT
TO anon, authenticated
USING (current_setting('lov.allow_pgs_view', true) = '1');

-- Simpler: instead of session var trickery, expose a SECURITY DEFINER function
DROP POLICY IF EXISTS "pgs status view read" ON public.payment_gateway_settings;

CREATE OR REPLACE FUNCTION public.payment_gateway_public()
RETURNS TABLE(provider text, is_enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT provider, is_enabled
  FROM public.payment_gateway_settings
  WHERE id = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.payment_gateway_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payment_gateway_public() TO anon, authenticated;

-- Drop the no-longer-needed view
DROP VIEW IF EXISTS public.payment_gateway_status;

-- =========================================================
-- 2) Move sensitive shop columns into a separate owner-only table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.shop_secrets (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  fraud_api_key text,
  fraud_api_provider text,
  fb_pixel_token text,
  fb_pixel_test_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.shop_secrets (shop_id, fraud_api_key, fraud_api_provider, fb_pixel_token, fb_pixel_test_id)
SELECT id, fraud_api_key, fraud_api_provider, fb_pixel_token, fb_pixel_test_id
FROM public.shops
WHERE fraud_api_key IS NOT NULL
   OR fraud_api_provider IS NOT NULL
   OR fb_pixel_token IS NOT NULL
   OR fb_pixel_test_id IS NOT NULL
ON CONFLICT (shop_id) DO NOTHING;

ALTER TABLE public.shops
  DROP COLUMN IF EXISTS fraud_api_key,
  DROP COLUMN IF EXISTS fraud_api_provider,
  DROP COLUMN IF EXISTS fb_pixel_token,
  DROP COLUMN IF EXISTS fb_pixel_test_id;

ALTER TABLE public.shop_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_secrets owner read"
ON public.shop_secrets FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "shop_secrets owner write"
ON public.shop_secrets FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE TRIGGER tg_shop_secrets_updated
  BEFORE UPDATE ON public.shop_secrets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 3) customer_wishlists: explicit shop-scoped INSERT, no anon write
-- =========================================================
DROP POLICY IF EXISTS "wishlists insert shop" ON public.customer_wishlists;
CREATE POLICY "wishlists insert shop"
ON public.customer_wishlists
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_shop_member(auth.uid(), shop_id)
  OR public.is_admin(auth.uid())
);

-- =========================================================
-- 4) wishlist_customers: scope writes to shop members; no anon writes
-- =========================================================
DROP POLICY IF EXISTS "wlc insert shop" ON public.wishlist_customers;
DROP POLICY IF EXISTS "wlc update shop" ON public.wishlist_customers;
DROP POLICY IF EXISTS "wlc delete shop" ON public.wishlist_customers;

CREATE POLICY "wlc insert shop"
ON public.wishlist_customers
FOR INSERT
TO authenticated
WITH CHECK (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));

CREATE POLICY "wlc update shop"
ON public.wishlist_customers
FOR UPDATE
TO authenticated
USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()))
WITH CHECK (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));

CREATE POLICY "wlc delete shop"
ON public.wishlist_customers
FOR DELETE
TO authenticated
USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));

-- =========================================================
-- 5) wishlist_templates: writes restricted via parent shop membership
-- =========================================================
DROP POLICY IF EXISTS "wlt insert shop" ON public.wishlist_templates;
DROP POLICY IF EXISTS "wlt update shop" ON public.wishlist_templates;
DROP POLICY IF EXISTS "wlt delete shop" ON public.wishlist_templates;

CREATE POLICY "wlt insert shop"
ON public.wishlist_templates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wishlist_customers c
    WHERE c.id = wishlist_customer_id
      AND (public.is_shop_member(auth.uid(), c.shop_id) OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "wlt update shop"
ON public.wishlist_templates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wishlist_customers c
    WHERE c.id = wishlist_customer_id
      AND (public.is_shop_member(auth.uid(), c.shop_id) OR public.is_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.wishlist_customers c
    WHERE c.id = wishlist_customer_id
      AND (public.is_shop_member(auth.uid(), c.shop_id) OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "wlt delete shop"
ON public.wishlist_templates
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wishlist_customers c
    WHERE c.id = wishlist_customer_id
      AND (public.is_shop_member(auth.uid(), c.shop_id) OR public.is_admin(auth.uid()))
  )
);

-- =========================================================
-- 6) marketplace_orders / order_items: remove permissive public-insert RLS.
--    All public order placement now goes through the marketplace-public
--    edge function which uses the service role and bypasses RLS.
-- =========================================================
DROP POLICY IF EXISTS "mp_orders public insert" ON public.marketplace_orders;
DROP POLICY IF EXISTS "mp_order_items public insert" ON public.marketplace_order_items;
