
CREATE OR REPLACE FUNCTION public.tg_shops_ensure_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix text;
  v_attempt int := 0;
  v_reserved text[] := ARRAY[
    'app','admin','auth','shop','shops','api','pricing','affiliate','f','_',
    'login','signup','register','logout','dashboard','contact','about','help',
    'support','terms','privacy','blog','docs','pages','static','public','assets',
    'marketplace','store','stores','vendor','vendors'
  ];
BEGIN
  IF NEW.username IS NOT NULL AND length(trim(NEW.username)) > 0 THEN
    RETURN NEW;
  END IF;

  -- slugify name
  v_base := lower(coalesce(NEW.name, ''));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := regexp_replace(v_base, '^-+|-+$', '', 'g');
  v_base := substr(v_base, 1, 24);

  -- ensure starts with alphanumeric and min length 3
  IF v_base IS NULL OR length(v_base) < 3 OR v_base !~ '^[a-z0-9]' THEN
    v_base := 'shop';
  END IF;

  v_candidate := v_base;

  LOOP
    v_attempt := v_attempt + 1;

    IF NOT (v_candidate = ANY(v_reserved))
       AND v_candidate ~ '^[a-z0-9][a-z0-9_-]{2,31}$'
       AND NOT EXISTS (SELECT 1 FROM public.shops WHERE lower(username) = v_candidate) THEN
      NEW.username := v_candidate;
      RETURN NEW;
    END IF;

    -- add random suffix
    v_suffix := substr(lower(regexp_replace(encode(extensions.gen_random_bytes(4), 'base64'), '[^a-z0-9]', '', 'g')), 1, 4);
    IF length(v_suffix) < 3 THEN
      v_suffix := substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
    END IF;
    v_candidate := substr(v_base, 1, 24) || '-' || v_suffix;

    IF v_attempt > 10 THEN
      NEW.username := 'shop-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      RETURN NEW;
    END IF;
  END LOOP;
END;
$function$;

DROP TRIGGER IF EXISTS shops_ensure_username ON public.shops;
CREATE TRIGGER shops_ensure_username
BEFORE INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.tg_shops_ensure_username();
