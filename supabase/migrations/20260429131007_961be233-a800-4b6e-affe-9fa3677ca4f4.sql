
-- 1. SMS Gateways (admin-managed)
CREATE TABLE public.sms_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('reve','whatsapp','telegram','other')),
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage gateways" ON public.sms_gateways
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_sms_gateways_updated BEFORE UPDATE ON public.sms_gateways
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. SMS Packages (admin-managed, public read)
CREATE TABLE public.sms_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sms_count INT NOT NULL CHECK (sms_count > 0),
  price_bdt NUMERIC(10,2) NOT NULL CHECK (price_bdt >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read active packages" ON public.sms_packages
  FOR SELECT USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "admin manage packages" ON public.sms_packages
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_sms_packages_updated BEFORE UPDATE ON public.sms_packages
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Shop SMS balance
CREATE TABLE public.shop_sms_balance (
  shop_id UUID NOT NULL PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  total_purchased INT NOT NULL DEFAULT 0,
  total_used INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_sms_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop members read sms balance" ON public.shop_sms_balance
  FOR SELECT USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_shop_sms_balance_updated BEFORE UPDATE ON public.shop_sms_balance
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. SMS Templates (admin-managed allowed templates)
CREATE TABLE public.sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "any auth read templates" ON public.sms_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin manage templates" ON public.sms_templates
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_sms_templates_updated BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed default templates
INSERT INTO public.sms_templates (code, name_bn, name_en, body_template, sort_order) VALUES
  ('due_reminder', 'বকেয়ার তাগাদা', 'Due Reminder', 'প্রিয় {name}, আপনার বকেয়া {due}৳। দ্রুত পরিশোধ করুন।', 1),
  ('payment_received', 'পেমেন্ট রিসিভ', 'Payment Received', '{name}, আপনার {amount}৳ পেমেন্ট পেয়েছি। ধন্যবাদ।', 2),
  ('sale_invoice', 'নতুন বিক্রয়', 'Sale Invoice', '{name}, আপনার ক্রয় {amount}৳। বকেয়া {due}৳।', 3),
  ('promotional', 'বিশেষ অফার', 'Promotional', 'আমাদের দোকানে বিশেষ অফার চলছে! আজই ভিজিট করুন।', 4);

-- 5. SMS History
CREATE TABLE public.sms_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  gateway_id UUID REFERENCES public.sms_gateways(id) ON DELETE SET NULL,
  template_code TEXT,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message TEXT NOT NULL,
  sms_count INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','copied')),
  provider_message_id TEXT,
  error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sms_history_shop_created ON public.sms_history (shop_id, created_at DESC);
ALTER TABLE public.sms_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop members read sms history" ON public.sms_history
  FOR SELECT USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));

-- 6. SMS Purchase Requests
CREATE TABLE public.sms_purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  package_id UUID REFERENCES public.sms_packages(id) ON DELETE SET NULL,
  sms_count INT NOT NULL,
  amount_bdt NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','cancelled')),
  recharge_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sms_purchase_shop ON public.sms_purchase_requests (shop_id, created_at DESC);
ALTER TABLE public.sms_purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop members read purchases" ON public.sms_purchase_requests
  FOR SELECT USING (public.is_shop_member(auth.uid(), shop_id) OR public.is_admin(auth.uid()));
CREATE POLICY "shop members create purchases" ON public.sms_purchase_requests
  FOR INSERT WITH CHECK (public.is_shop_member(auth.uid(), shop_id) AND auth.uid() = user_id);
CREATE POLICY "admin manage purchases" ON public.sms_purchase_requests
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_sms_purchase_updated BEFORE UPDATE ON public.sms_purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Helper: ensure only one primary gateway
CREATE OR REPLACE FUNCTION public.tg_sms_gateway_single_primary()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.sms_gateways SET is_primary = false WHERE id <> NEW.id AND is_primary = true;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sms_gateway_single_primary
  AFTER INSERT OR UPDATE OF is_primary ON public.sms_gateways
  FOR EACH ROW WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION public.tg_sms_gateway_single_primary();

-- Helper RPC: credit SMS balance (admin-only)
CREATE OR REPLACE FUNCTION public.admin_credit_sms_balance(_shop_id UUID, _count INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.shop_sms_balance (shop_id, balance, total_purchased)
  VALUES (_shop_id, _count, _count)
  ON CONFLICT (shop_id) DO UPDATE
    SET balance = shop_sms_balance.balance + _count,
        total_purchased = shop_sms_balance.total_purchased + _count,
        updated_at = now();
END $$;
