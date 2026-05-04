
CREATE OR REPLACE FUNCTION public.tg_shops_ensure_wishlist_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_slug text;
  v_attempt int := 0;
BEGIN
  IF NEW.wishlist_slug IS NOT NULL AND length(trim(NEW.wishlist_slug)) > 0 THEN
    RETURN NEW;
  END IF;
  LOOP
    v_attempt := v_attempt + 1;
    v_slug := lower(regexp_replace(encode(extensions.gen_random_bytes(8), 'base64'), '[^a-zA-Z0-9]', '', 'g'));
    v_slug := substr(v_slug, 1, 8);
    IF length(v_slug) >= 6
       AND NOT EXISTS (SELECT 1 FROM public.shops WHERE wishlist_slug = v_slug) THEN
      NEW.wishlist_slug := v_slug;
      RETURN NEW;
    END IF;
    IF v_attempt > 10 THEN
      NEW.wishlist_slug := substr(lower(replace(gen_random_uuid()::text, '-', '')), 1, 12);
      RETURN NEW;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tg_wishlist_ensure_share_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_tok text;
  v_attempt int := 0;
BEGIN
  IF NEW.share_token IS NOT NULL AND length(NEW.share_token) >= 8 THEN
    RETURN NEW;
  END IF;
  LOOP
    v_attempt := v_attempt + 1;
    v_tok := substr(lower(regexp_replace(encode(extensions.gen_random_bytes(12), 'base64'), '[^a-zA-Z0-9]', '', 'g')), 1, 16);
    IF length(v_tok) >= 12
       AND NOT EXISTS (SELECT 1 FROM public.customer_wishlists WHERE share_token = v_tok) THEN
      NEW.share_token := v_tok;
      RETURN NEW;
    END IF;
    IF v_attempt > 10 THEN
      NEW.share_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
      RETURN NEW;
    END IF;
  END LOOP;
END;
$function$;
