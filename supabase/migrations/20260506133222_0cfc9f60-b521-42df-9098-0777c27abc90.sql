
-- Fix 1: Hide marketplace_products.default_cost from anonymous users (sensitive cost/margin data).
-- Authenticated users (shop owners using sample import & catalog picker) keep access.
REVOKE SELECT (default_cost) ON public.marketplace_products FROM anon;

-- Also hide cost from variants table if anon can read it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'marketplace_product_variants'
      AND column_name = 'default_cost'
  ) THEN
    EXECUTE 'REVOKE SELECT (default_cost) ON public.marketplace_product_variants FROM anon';
  END IF;
END $$;

-- Fix 2: Tighten anonymous INSERT on service_bookings to only allow bookings against
-- real, active, booking-enabled services for the matching shop.
DROP POLICY IF EXISTS "Anyone can create booking" ON public.service_bookings;

CREATE POLICY "Anyone can create valid booking"
ON public.service_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_bookings.service_id
      AND s.shop_id = service_bookings.shop_id
      AND s.is_active = true
      AND s.booking_enabled = true
  )
);
