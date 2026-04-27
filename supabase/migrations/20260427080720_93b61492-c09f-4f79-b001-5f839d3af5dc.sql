CREATE TABLE IF NOT EXISTS public.bd_divisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_id text UNIQUE,
  name_en text NOT NULL,
  name_bn text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bd_districts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_id text UNIQUE,
  division_legacy_id text NOT NULL,
  name_en text NOT NULL,
  name_bn text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bd_districts_div ON public.bd_districts(division_legacy_id);

CREATE TABLE IF NOT EXISTS public.bd_upazilas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_id text UNIQUE,
  district_legacy_id text NOT NULL,
  name_en text NOT NULL,
  name_bn text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bd_upazilas_dist ON public.bd_upazilas(district_legacy_id);

ALTER TABLE public.bd_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bd_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bd_upazilas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bd_div public read" ON public.bd_divisions;
CREATE POLICY "bd_div public read" ON public.bd_divisions FOR SELECT USING (true);
DROP POLICY IF EXISTS "bd_div admin write" ON public.bd_divisions;
CREATE POLICY "bd_div admin write" ON public.bd_divisions FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "bd_dist public read" ON public.bd_districts;
CREATE POLICY "bd_dist public read" ON public.bd_districts FOR SELECT USING (true);
DROP POLICY IF EXISTS "bd_dist admin write" ON public.bd_districts;
CREATE POLICY "bd_dist admin write" ON public.bd_districts FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "bd_upa public read" ON public.bd_upazilas;
CREATE POLICY "bd_upa public read" ON public.bd_upazilas FOR SELECT USING (true);
DROP POLICY IF EXISTS "bd_upa admin write" ON public.bd_upazilas;
CREATE POLICY "bd_upa admin write" ON public.bd_upazilas FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_bd_div_updated ON public.bd_divisions;
CREATE TRIGGER trg_bd_div_updated BEFORE UPDATE ON public.bd_divisions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_bd_dist_updated ON public.bd_districts;
CREATE TRIGGER trg_bd_dist_updated BEFORE UPDATE ON public.bd_districts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_bd_upa_updated ON public.bd_upazilas;
CREATE TRIGGER trg_bd_upa_updated BEFORE UPDATE ON public.bd_upazilas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.seller_locations ADD COLUMN IF NOT EXISTS area text;

ALTER TABLE public.consumer_profiles
  ADD COLUMN IF NOT EXISTS division text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS upazila text,
  ADD COLUMN IF NOT EXISTS area text;