CREATE TABLE public.training_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_bn text NOT NULL,
  title_en text NOT NULL DEFAULT '',
  youtube_id text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_videos public read"
  ON public.training_videos FOR SELECT
  USING (is_published = true OR public.is_admin(auth.uid()));

CREATE POLICY "training_videos admin write"
  ON public.training_videos FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER training_videos_set_updated_at
  BEFORE UPDATE ON public.training_videos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX training_videos_category_idx ON public.training_videos (category, sort_order);