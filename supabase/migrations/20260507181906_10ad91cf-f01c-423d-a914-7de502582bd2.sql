CREATE OR REPLACE FUNCTION public.is_business_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL AND (
      public.is_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.shops s WHERE s.owner_id = _user_id AND s.deleted_at IS NULL)
      OR EXISTS (SELECT 1 FROM public.shop_members m WHERE m.user_id = _user_id)
    )
$$;

REVOKE ALL ON FUNCTION public.is_business_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_business_user(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "mp_products public read" ON public.marketplace_products;

CREATE POLICY "mp_products business read"
ON public.marketplace_products
FOR SELECT
TO authenticated
USING (
  (is_active = true AND public.is_business_user(auth.uid()))
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "mpv_read_all" ON public.marketplace_product_variants;

CREATE POLICY "mpv_business_read"
ON public.marketplace_product_variants
FOR SELECT
TO authenticated
USING (
  public.is_business_user(auth.uid())
  OR public.is_admin(auth.uid())
);