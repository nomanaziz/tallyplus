CREATE TABLE public.ad_settings (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT false,
  adsense_publisher_id text,
  show_to_free_owners boolean NOT NULL DEFAULT true,
  show_to_consumers boolean NOT NULL DEFAULT true,
  show_to_subscribers boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ad_settings_singleton CHECK (id = true)
);

ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_settings public read" ON public.ad_settings FOR SELECT USING (true);
CREATE POLICY "ad_settings admin write" ON public.ad_settings FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.ad_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.ad_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key text NOT NULL UNIQUE,
  label text NOT NULL,
  mode text NOT NULL DEFAULT 'disabled' CHECK (mode IN ('adsense','custom','disabled')),
  adsense_slot_id text,
  adsense_format text NOT NULL DEFAULT 'auto',
  custom_image_url text,
  custom_link_url text,
  custom_title text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_slots public read" ON public.ad_slots FOR SELECT USING (true);
CREATE POLICY "ad_slots admin write" ON public.ad_slots FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.ad_slots (slot_key, label, sort_order) VALUES
  ('app_top', 'App — Top Banner', 10),
  ('app_sidebar', 'App — Sidebar (Desktop)', 20),
  ('app_mobile_sticky', 'App — Mobile Sticky Bottom', 30),
  ('app_dashboard_inline', 'App — Dashboard Inline', 40),
  ('customer_top', 'Customer Portal — Top Banner', 50),
  ('customer_sidebar', 'Customer Portal — Sidebar', 60),
  ('customer_inline', 'Customer Portal — Inline (Lists)', 70),
  ('fordo_public', 'Public Fordo Page (/f/:slug)', 80)
ON CONFLICT (slot_key) DO NOTHING;