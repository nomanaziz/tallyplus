
CREATE OR REPLACE FUNCTION public.my_incoming_shop_transfers()
RETURNS TABLE(id uuid, shop_id uuid, reason text, charge_amount numeric, shop_name text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id, r.shop_id, r.reason, r.charge_amount, s.name, r.created_at
  FROM public.shop_transfer_requests r
  LEFT JOIN public.shops s ON s.id = r.shop_id
  WHERE r.to_user_id = auth.uid()
    AND r.status = 'pending_recipient'
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.my_incoming_shop_transfers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_incoming_shop_transfers() TO authenticated;
