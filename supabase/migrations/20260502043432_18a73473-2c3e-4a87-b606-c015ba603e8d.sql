
-- Helper: collect all phone numbers known for a user
CREATE OR REPLACE FUNCTION public.user_phones(_uid uuid)
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT DISTINCT regexp_replace(p, '[^0-9]', '', 'g')
    FROM (
      SELECT phone AS p FROM auth.users WHERE id = _uid AND phone IS NOT NULL
      UNION
      SELECT phone FROM public.profiles WHERE id = _uid AND phone IS NOT NULL
      UNION
      SELECT phone FROM public.consumer_profiles WHERE id = _uid AND phone IS NOT NULL
    ) s
    WHERE p IS NOT NULL AND length(regexp_replace(p, '[^0-9]', '', 'g')) >= 6
  );
$$;

-- RPC for the client to fetch its own phone list
CREATE OR REPLACE FUNCTION public.my_phones()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_phones(auth.uid());
$$;

-- RLS: allow consumer to see orders where customer_phone matches one of their phones
DROP POLICY IF EXISTS "orders read by consumer phone" ON public.marketplace_orders;
CREATE POLICY "orders read by consumer phone"
ON public.marketplace_orders
FOR SELECT
TO authenticated
USING (
  consumer_user_id = auth.uid()
  OR regexp_replace(coalesce(customer_phone,''), '[^0-9]', '', 'g')
     = ANY (public.user_phones(auth.uid()))
);

-- Allow reading order items for any order the user can see
DROP POLICY IF EXISTS "order items read by consumer" ON public.marketplace_order_items;
CREATE POLICY "order items read by consumer"
ON public.marketplace_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_orders mo
    WHERE mo.id = marketplace_order_items.order_id
      AND (
        mo.consumer_user_id = auth.uid()
        OR regexp_replace(coalesce(mo.customer_phone,''), '[^0-9]', '', 'g')
           = ANY (public.user_phones(auth.uid()))
      )
  )
);

-- One-time backfill: link orders to user accounts by phone match
UPDATE public.marketplace_orders mo
SET consumer_user_id = u.id
FROM auth.users u
WHERE mo.consumer_user_id IS NULL
  AND u.phone IS NOT NULL
  AND regexp_replace(coalesce(mo.customer_phone,''), '[^0-9]', '', 'g')
      = regexp_replace(u.phone, '[^0-9]', '', 'g')
  AND length(regexp_replace(u.phone, '[^0-9]', '', 'g')) >= 6;
