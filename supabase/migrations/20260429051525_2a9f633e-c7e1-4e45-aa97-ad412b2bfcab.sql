-- Ensure uniqueness for top-level category names per shop
CREATE UNIQUE INDEX IF NOT EXISTS categories_shop_toplevel_name_uniq
  ON public.categories (shop_id, name)
  WHERE parent_id IS NULL;

-- Server-side seeder: skips silently for non-members so the client never sees RLS errors
CREATE OR REPLACE FUNCTION public.ensure_default_categories(
  _shop_id uuid,
  _names   text[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _shop_id IS NULL OR _names IS NULL OR array_length(_names, 1) IS NULL THEN
    RETURN;
  END IF;
  IF NOT public.is_shop_member(auth.uid(), _shop_id) THEN
    RETURN;
  END IF;
  INSERT INTO public.categories (shop_id, name, parent_id)
  SELECT _shop_id, n, NULL
  FROM unnest(_names) AS n
  ON CONFLICT (shop_id, name) WHERE parent_id IS NULL DO NOTHING;
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_default_categories(uuid, text[]) TO authenticated;