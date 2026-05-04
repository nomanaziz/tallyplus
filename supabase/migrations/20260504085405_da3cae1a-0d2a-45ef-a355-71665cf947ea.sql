-- ============================================================
-- Free Trial system
-- ============================================================

-- 1) Add 'trial' to subscription_status enum
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'trial';

-- 2) trial_settings table (single-row global config)
CREATE TABLE IF NOT EXISTS public.trial_settings (
  id boolean PRIMARY KEY DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  duration_days int NOT NULL DEFAULT 30,
  warn_days_before int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trial_settings_singleton CHECK (id = true)
);

ALTER TABLE public.trial_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trial_settings_read_all" ON public.trial_settings;
CREATE POLICY "trial_settings_read_all" ON public.trial_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "trial_settings_admin_write" ON public.trial_settings;
CREATE POLICY "trial_settings_admin_write" ON public.trial_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS tg_trial_settings_updated_at ON public.trial_settings;
CREATE TRIGGER tg_trial_settings_updated_at
  BEFORE UPDATE ON public.trial_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.trial_settings (id, is_enabled, duration_days, warn_days_before)
  VALUES (true, true, 30, 5)
  ON CONFLICT (id) DO NOTHING;

-- 3) Trial plan row + unlimited usage limits
INSERT INTO public.subscription_plans (code, name_bn, name_en, price_bdt, duration_days, max_shops, is_active, is_lifetime)
  VALUES ('trial', 'ফ্রি ট্রায়াল', 'Free Trial', 0, 30, 2, true, false)
  ON CONFLICT (code) DO UPDATE SET name_bn = EXCLUDED.name_bn, duration_days = EXCLUDED.duration_days, is_active = true;

-- usage_limits for trial = unlimited (-1) for every feature the free plan caps
INSERT INTO public.usage_limits (plan_code, feature_key, limit_count)
SELECT 'trial', feature_key, -1
FROM public.usage_limits WHERE plan_code = 'free'
ON CONFLICT (plan_code, feature_key) DO UPDATE SET limit_count = -1;
