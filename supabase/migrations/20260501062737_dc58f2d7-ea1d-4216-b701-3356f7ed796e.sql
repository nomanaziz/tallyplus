-- Auto-generate wishlist_slug for new shops via trigger
CREATE OR REPLACE FUNCTION public.tg_shops_ensure_wishlist_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slug text;
  v_attempt int := 0;
BEGIN
  IF NEW.wishlist_slug IS NOT NULL AND length(trim(NEW.wishlist_slug)) > 0 THEN
    RETURN NEW;
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    -- 8-char lowercased alphanumeric slug
    v_slug := lower(
      regexp_replace(
        encode(gen_random_bytes(8), 'base64'),
        '[^a-zA-Z0-9]', '', 'g'
      )
    );
    v_slug := substr(v_slug, 1, 8);

    -- Make sure non-empty and unique
    IF length(v_slug) >= 6
       AND NOT EXISTS (SELECT 1 FROM public.shops WHERE wishlist_slug = v_slug) THEN
      NEW.wishlist_slug := v_slug;
      RETURN NEW;
    END IF;

    IF v_attempt > 10 THEN
      -- Fallback: append uuid fragment
      NEW.wishlist_slug := lower(replace(gen_random_uuid()::text, '-', ''))::text;
      NEW.wishlist_slug := substr(NEW.wishlist_slug, 1, 12);
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS tg_shops_wishlist_slug_ins ON public.shops;
CREATE TRIGGER tg_shops_wishlist_slug_ins
BEFORE INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.tg_shops_ensure_wishlist_slug();

DROP TRIGGER IF EXISTS tg_shops_wishlist_slug_upd ON public.shops;
CREATE TRIGGER tg_shops_wishlist_slug_upd
BEFORE UPDATE ON public.shops
FOR EACH ROW
WHEN (NEW.wishlist_slug IS NULL)
EXECUTE FUNCTION public.tg_shops_ensure_wishlist_slug();

-- Backfill existing NULL slugs
UPDATE public.shops
SET wishlist_slug = lower(
  substr(
    regexp_replace(encode(gen_random_bytes(8), 'base64'), '[^a-zA-Z0-9]', '', 'g'),
    1, 8
  )
)
WHERE wishlist_slug IS NULL OR length(trim(wishlist_slug)) = 0;

-- Helper: resolve a public shop by handle (wishlist_slug or username or slug)
CREATE OR REPLACE FUNCTION public.resolve_shop_by_handle(_handle text)
RETURNS TABLE(id uuid, name text, logo_url text, wishlist_slug text, username text, slug text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.logo_url, s.wishlist_slug, s.username, s.slug, s.phone
  FROM public.shops s
  WHERE s.deleted_at IS NULL
    AND (
      lower(s.wishlist_slug) = lower(_handle)
      OR lower(s.username) = lower(_handle)
      OR lower(s.slug) = lower(_handle)
    )
  ORDER BY (lower(s.wishlist_slug) = lower(_handle)) DESC,
           (lower(s.username) = lower(_handle)) DESC
  LIMIT 1;
$$;