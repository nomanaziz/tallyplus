
-- Templates
CREATE TABLE public.consumer_fordo_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consumer_user_id uuid NOT NULL,
  name text NOT NULL,
  note text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consumer_fordo_templates_user ON public.consumer_fordo_templates(consumer_user_id);

ALTER TABLE public.consumer_fordo_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own fordo templates"
  ON public.consumer_fordo_templates FOR SELECT
  USING (auth.uid() = consumer_user_id);
CREATE POLICY "Owner can insert own fordo templates"
  ON public.consumer_fordo_templates FOR INSERT
  WITH CHECK (auth.uid() = consumer_user_id);
CREATE POLICY "Owner can update own fordo templates"
  ON public.consumer_fordo_templates FOR UPDATE
  USING (auth.uid() = consumer_user_id);
CREATE POLICY "Owner can delete own fordo templates"
  ON public.consumer_fordo_templates FOR DELETE
  USING (auth.uid() = consumer_user_id);

CREATE TRIGGER trg_consumer_fordo_templates_updated_at
  BEFORE UPDATE ON public.consumer_fordo_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Schedules
CREATE TABLE public.consumer_fordo_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consumer_user_id uuid NOT NULL,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.consumer_fordo_templates(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  recurrence text NOT NULL CHECK (recurrence IN ('monthly','weekly','once')),
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  run_at timestamptz,
  next_run_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consumer_fordo_schedules_user ON public.consumer_fordo_schedules(consumer_user_id);
CREATE INDEX idx_consumer_fordo_schedules_due ON public.consumer_fordo_schedules(next_run_at) WHERE is_active = true;

ALTER TABLE public.consumer_fordo_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own fordo schedules"
  ON public.consumer_fordo_schedules FOR SELECT
  USING (auth.uid() = consumer_user_id);
CREATE POLICY "Owner can insert own fordo schedules"
  ON public.consumer_fordo_schedules FOR INSERT
  WITH CHECK (auth.uid() = consumer_user_id);
CREATE POLICY "Owner can update own fordo schedules"
  ON public.consumer_fordo_schedules FOR UPDATE
  USING (auth.uid() = consumer_user_id);
CREATE POLICY "Owner can delete own fordo schedules"
  ON public.consumer_fordo_schedules FOR DELETE
  USING (auth.uid() = consumer_user_id);

CREATE TRIGGER trg_consumer_fordo_schedules_updated_at
  BEFORE UPDATE ON public.consumer_fordo_schedules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
