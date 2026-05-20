
-- 1. Remove public anonymous read of promo_codes (owner manage policy already covers shop members)
DROP POLICY IF EXISTS "promo_codes public read active" ON public.promo_codes;

-- 2. Hide pin_hash column from non-admin/non-definer reads
REVOKE SELECT (pin_hash) ON public.wishlist_customers FROM anon, authenticated;

-- 3. Set search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END
$function$;
