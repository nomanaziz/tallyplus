
-- 1. affiliate_support_messages: replace WITH CHECK (true) with authenticated-only
DROP POLICY IF EXISTS "support insert any" ON public.affiliate_support_messages;
CREATE POLICY "support insert authenticated"
ON public.affiliate_support_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. sms_gateways: add explicit admin-only SELECT policy (currently no SELECT policy exists; default-deny — make it explicit)
DROP POLICY IF EXISTS "admin read gateways" ON public.sms_gateways;
CREATE POLICY "admin read gateways"
ON public.sms_gateways
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- 3. shop_transfer_requests: add explicit INSERT policy scoped to sender
DROP POLICY IF EXISTS "str_insert_own" ON public.shop_transfer_requests;
CREATE POLICY "str_insert_own"
ON public.shop_transfer_requests
FOR INSERT
TO authenticated
WITH CHECK (from_user_id = auth.uid());
