CREATE OR REPLACE FUNCTION public.tg_product_brands_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin new.updated_at = now(); return new; end;
$function$;