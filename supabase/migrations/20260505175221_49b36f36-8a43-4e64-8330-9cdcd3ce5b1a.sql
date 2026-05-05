CREATE TABLE IF NOT EXISTS public.admin_telegram_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL UNIQUE,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  events text[] NOT NULL DEFAULT ARRAY['all']::text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_telegram_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage telegram subs"
ON public.admin_telegram_subscribers FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_admin_telegram_subs_updated
BEFORE UPDATE ON public.admin_telegram_subscribers
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.telegram_dispatch_settings (
  id int PRIMARY KEY DEFAULT 1,
  function_url text NOT NULL DEFAULT 'https://hnkyeohwjcqhgulgdydd.supabase.co/functions/v1/telegram-notify',
  anon_key text NOT NULL DEFAULT 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhua3llb2h3amNxaGd1bGdkeWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMDI4MDYsImV4cCI6MjA5MjU3ODgwNn0.-7U11D7z5RC55gv8Wpf__4M673gyyHrGK8Rb2S6kAMY',
  enabled boolean NOT NULL DEFAULT true,
  CONSTRAINT one_row CHECK (id = 1)
);
ALTER TABLE public.telegram_dispatch_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super admin manage dispatch"
ON public.telegram_dispatch_settings FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
INSERT INTO public.telegram_dispatch_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.dispatch_admin_telegram(
  _event_type text, _title text, _body text, _link text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg public.telegram_dispatch_settings;
BEGIN
  SELECT * INTO cfg FROM public.telegram_dispatch_settings WHERE id = 1;
  IF cfg IS NULL OR NOT cfg.enabled THEN RETURN; END IF;
  PERFORM net.http_post(
    url := cfg.function_url,
    headers := jsonb_build_object('Content-Type','application/json','apikey',cfg.anon_key,'Authorization','Bearer '||cfg.anon_key),
    body := jsonb_build_object('event_type',_event_type,'title',_title,'body',_body,'link',_link)
  );
EXCEPTION WHEN OTHERS THEN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_notify_admin_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.dispatch_admin_telegram('order','🛒 নতুন অর্ডার',
    format('গ্রাহক: %s%sফোন: %s%sমোট: ৳%s%sস্ট্যাটাস: %s',
      NEW.customer_name, E'\n', NEW.customer_phone, E'\n', NEW.total::text, E'\n', NEW.status),
    '/admin/marketplace');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_admin_new_order ON public.marketplace_orders;
CREATE TRIGGER trg_notify_admin_new_order AFTER INSERT ON public.marketplace_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_new_order();

CREATE OR REPLACE FUNCTION public.trg_notify_admin_new_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.dispatch_admin_telegram('signup','👤 নতুন গ্রাহক সাইনআপ',
    format('নাম: %s%sফোন: %s', COALESCE(NEW.full_name,'—'), E'\n', COALESCE(NEW.phone,'—')),
    '/admin/users');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_admin_new_signup ON public.consumer_profiles;
CREATE TRIGGER trg_notify_admin_new_signup AFTER INSERT ON public.consumer_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_new_signup();

CREATE OR REPLACE FUNCTION public.trg_notify_admin_new_fordo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.dispatch_admin_telegram('fordo','📝 নতুন ফর্দ তৈরি',
    format('নাম: %s', COALESCE(NEW.name,'—')), '/admin');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_admin_new_fordo ON public.consumer_fordo_templates;
CREATE TRIGGER trg_notify_admin_new_fordo AFTER INSERT ON public.consumer_fordo_templates
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_new_fordo();