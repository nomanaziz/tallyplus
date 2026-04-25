-- Dashboard banners table
CREATE TABLE public.dashboard_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title_bn text,
  title_en text,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_banners public read"
  ON public.dashboard_banners FOR SELECT
  USING ((is_active = true) OR public.is_admin(auth.uid()));

CREATE POLICY "dashboard_banners admin write"
  ON public.dashboard_banners FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER set_dashboard_banners_updated_at
  BEFORE UPDATE ON public.dashboard_banners
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dashboard-banners', 'dashboard-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "dashboard-banners public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dashboard-banners');

CREATE POLICY "dashboard-banners admin insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dashboard-banners' AND public.is_admin(auth.uid()));

CREATE POLICY "dashboard-banners admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'dashboard-banners' AND public.is_admin(auth.uid()));

CREATE POLICY "dashboard-banners admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dashboard-banners' AND public.is_admin(auth.uid()));