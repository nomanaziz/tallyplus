-- 1. Add username + policy/about fields to shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS return_policy text,
  ADD COLUMN IF NOT EXISTS shipping_policy text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS meta_description text;

-- Backfill username from slug where possible (lowercase, replace non-allowed)
UPDATE public.shops
SET username = lower(regexp_replace(coalesce(slug, replace(name, ' ', '-')), '[^a-z0-9_-]', '', 'g'))
WHERE username IS NULL;

-- Validation constraint
ALTER TABLE public.shops
  ADD CONSTRAINT shops_username_format
  CHECK (username IS NULL OR (username ~ '^[a-z0-9][a-z0-9_-]{2,31}$'));

-- Unique index (case-insensitive via lowercase storage)
CREATE UNIQUE INDEX IF NOT EXISTS shops_username_unique ON public.shops (username)
  WHERE username IS NOT NULL AND deleted_at IS NULL;

-- 2. Visits table
CREATE TABLE IF NOT EXISTS public.shop_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text
);
CREATE INDEX IF NOT EXISTS shop_visits_shop_idx ON public.shop_visits (shop_id, visited_at DESC);

ALTER TABLE public.shop_visits ENABLE ROW LEVEL SECURITY;

-- Owner / admin can read visits
CREATE POLICY "shop_visits read shop"
  ON public.shop_visits
  FOR SELECT
  USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));

-- Inserts only allowed via edge function (service role bypasses RLS); block client inserts
-- (no INSERT policy means anon/authenticated cannot insert)
