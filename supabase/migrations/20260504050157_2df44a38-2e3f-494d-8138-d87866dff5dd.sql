
DROP POLICY IF EXISTS "aff_commissions insert auth" ON public.affiliate_commissions;
DROP POLICY IF EXISTS "aff_referrals insert auth" ON public.affiliate_referrals;

-- Only admins may insert commissions directly; normal flow goes through service-role edge functions which bypass RLS.
CREATE POLICY "aff_commissions admin insert"
ON public.affiliate_commissions
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Only admins may insert referrals directly; signup attribution should run via service-role edge function.
CREATE POLICY "aff_referrals admin insert"
ON public.affiliate_referrals
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));
