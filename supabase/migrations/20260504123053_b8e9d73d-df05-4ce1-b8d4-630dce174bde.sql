
-- Tighten payment_methods: only authenticated users can read active records (was anon+authenticated)
DROP POLICY IF EXISTS "payment_methods public read active" ON public.payment_methods;
CREATE POLICY "payment_methods authenticated read active"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (is_active = true OR is_admin(auth.uid()));

-- Tighten shop_delivery_zones: remove broad anon/authenticated read.
-- Public marketplace access goes through the marketplace-public edge function (service role),
-- and the in-app management UI uses the existing shop-member SELECT policy.
DROP POLICY IF EXISTS "zones public read active" ON public.shop_delivery_zones;
