-- ===== Affiliate v2: wallet, withdrawals, agents, marketing assets, payout methods =====

-- 1) Extend affiliate_settings
ALTER TABLE public.affiliate_settings
  ADD COLUMN IF NOT EXISTS min_withdrawal_amount numeric NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS max_withdrawal_per_month numeric NOT NULL DEFAULT 100000,
  ADD COLUMN IF NOT EXISTS agent_override_pct numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_tier_upgrade boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS subscription_pay_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS support_phone text DEFAULT '+8809638011199',
  ADD COLUMN IF NOT EXISTS support_email text DEFAULT 'support@hishabee.io',
  ADD COLUMN IF NOT EXISTS live_chat_url text;

-- 2) Extend affiliate_tiers with color
ALTER TABLE public.affiliate_tiers
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#FACC15';

-- 3) Seed default tiers if table is empty
INSERT INTO public.affiliate_tiers (name, min_sales, commission_pct, bonus_pct, sort_order, color)
SELECT * FROM (VALUES
  ('Independent', 0, 10, 0, 1, '#9CA3AF'),
  ('Active', 10000, 15, 10, 2, '#10B981'),
  ('Rising Star', 50000, 16, 5, 3, '#06B6D4'),
  ('Bronze', 100000, 18, 2.5, 4, '#A16207'),
  ('Silver', 500000, 20, 2, 5, '#94A3B8'),
  ('Gold', 1000000, 22, 2, 6, '#EAB308'),
  ('Platinum', 2500000, 23, 2, 7, '#E5E7EB'),
  ('Diamond', 5000000, 24, 2, 8, '#60A5FA'),
  ('Titan', 10000000, 25, 2, 9, '#A855F7')
) AS v(name, min_sales, commission_pct, bonus_pct, sort_order, color)
WHERE NOT EXISTS (SELECT 1 FROM public.affiliate_tiers);

-- 4) affiliate_wallet
CREATE TABLE IF NOT EXISTS public.affiliate_wallet (
  affiliate_id uuid PRIMARY KEY,
  available_balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  lifetime_earned numeric NOT NULL DEFAULT 0,
  lifetime_withdrawn numeric NOT NULL DEFAULT 0,
  lifetime_spent_on_subscription numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet read own" ON public.affiliate_wallet FOR SELECT
  USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_wallet.affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "wallet admin write" ON public.affiliate_wallet FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 5) affiliate_wallet_transactions (ledger)
CREATE TABLE IF NOT EXISTS public.affiliate_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('commission_credit','agent_bonus','tier_bonus','withdrawal_debit','withdrawal_refund','subscription_debit','adjustment')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  reference_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_tx read own" ON public.affiliate_wallet_transactions FOR SELECT
  USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_wallet_transactions.affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "wallet_tx admin write" ON public.affiliate_wallet_transactions FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_wallet_tx_aff ON public.affiliate_wallet_transactions (affiliate_id, created_at DESC);

-- 6) affiliate_withdrawals
CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  account_number text NOT NULL,
  account_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  admin_note text,
  transaction_ref text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid
);
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals read own" ON public.affiliate_withdrawals FOR SELECT
  USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_withdrawals.affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "withdrawals insert own" ON public.affiliate_withdrawals FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_withdrawals.affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "withdrawals admin update" ON public.affiliate_withdrawals FOR UPDATE
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "withdrawals admin delete" ON public.affiliate_withdrawals FOR DELETE
  USING (is_admin(auth.uid()));

-- 7) affiliate_agents (sub-affiliates added under a parent)
CREATE TABLE IF NOT EXISTS public.affiliate_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_affiliate_id uuid NOT NULL,
  agent_user_id uuid,
  agent_referral_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  total_subscriptions integer NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents read own" ON public.affiliate_agents FOR SELECT
  USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_agents.parent_affiliate_id AND a.user_id = auth.uid()) OR agent_user_id = auth.uid());
CREATE POLICY "agents insert own" ON public.affiliate_agents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_agents.parent_affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "agents update own" ON public.affiliate_agents FOR UPDATE
  USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_agents.parent_affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "agents admin delete" ON public.affiliate_agents FOR DELETE
  USING (is_admin(auth.uid()));

-- 8) affiliate_payout_methods
CREATE TABLE IF NOT EXISTS public.affiliate_payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label_bn text NOT NULL,
  label_en text NOT NULL,
  min_amount numeric NOT NULL DEFAULT 100,
  max_amount numeric NOT NULL DEFAULT 100000,
  fee_pct numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.affiliate_payout_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout_methods public read" ON public.affiliate_payout_methods FOR SELECT USING (true);
CREATE POLICY "payout_methods admin write" ON public.affiliate_payout_methods FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.affiliate_payout_methods (key, label_bn, label_en, min_amount, max_amount, sort_order)
SELECT * FROM (VALUES
  ('bkash', 'বিকাশ', 'bKash', 500, 50000, 1),
  ('nagad', 'নগদ', 'Nagad', 500, 50000, 2),
  ('rocket', 'রকেট', 'Rocket', 500, 50000, 3),
  ('bank', 'ব্যাংক ট্রান্সফার', 'Bank Transfer', 1000, 500000, 4)
) AS v(key,label_bn,label_en,min_amount,max_amount,sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.affiliate_payout_methods);

-- 9) affiliate_marketing_assets
CREATE TABLE IF NOT EXISTS public.affiliate_marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('banner','video','copy','pdf','image')),
  url text,
  body text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_marketing_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mkt_assets public read" ON public.affiliate_marketing_assets FOR SELECT
  USING (is_active = true OR is_admin(auth.uid()));
CREATE POLICY "mkt_assets admin write" ON public.affiliate_marketing_assets FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 10) affiliate_support_messages
CREATE TABLE IF NOT EXISTS public.affiliate_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid,
  name text NOT NULL,
  email text,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support insert any" ON public.affiliate_support_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "support read own" ON public.affiliate_support_messages FOR SELECT
  USING (is_admin(auth.uid()) OR (affiliate_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_support_messages.affiliate_id AND a.user_id = auth.uid())));
CREATE POLICY "support admin write" ON public.affiliate_support_messages FOR UPDATE
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 11) Helper: ensure wallet row exists
CREATE OR REPLACE FUNCTION public.ensure_affiliate_wallet(_aff_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.affiliate_wallet (affiliate_id) VALUES (_aff_id)
  ON CONFLICT (affiliate_id) DO NOTHING;
END $$;

-- Auto-create wallet when affiliate created
CREATE OR REPLACE FUNCTION public.tg_affiliate_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.affiliate_wallet (affiliate_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_affiliate_wallet_create ON public.affiliates;
CREATE TRIGGER trg_affiliate_wallet_create AFTER INSERT ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.tg_affiliate_created();

-- Backfill wallets for existing affiliates
INSERT INTO public.affiliate_wallet (affiliate_id)
SELECT id FROM public.affiliates ON CONFLICT DO NOTHING;

-- 12) Recompute tier
CREATE OR REPLACE FUNCTION public.affiliate_recalculate_tier(_aff_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total numeric;
  v_tier_id uuid;
BEGIN
  SELECT COALESCE(SUM(subscription_amount),0) INTO v_total
  FROM public.affiliate_commissions WHERE affiliate_id = _aff_id AND status IN ('approved','paid');
  SELECT id INTO v_tier_id FROM public.affiliate_tiers
  WHERE min_sales <= v_total ORDER BY min_sales DESC LIMIT 1;
  UPDATE public.affiliates SET current_tier_id = v_tier_id, updated_at = now() WHERE id = _aff_id;
END $$;

-- 13) Apply commission credit (called when status becomes approved)
CREATE OR REPLACE FUNCTION public.tg_commission_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bal numeric;
BEGIN
  -- pending -> approved: credit available
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    PERFORM public.ensure_affiliate_wallet(NEW.affiliate_id);
    UPDATE public.affiliate_wallet
      SET pending_balance = pending_balance + NEW.commission_amount, updated_at = now()
      WHERE affiliate_id = NEW.affiliate_id;
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
    PERFORM public.ensure_affiliate_wallet(NEW.affiliate_id);
    IF NEW.status IN ('approved','paid') AND OLD.status NOT IN ('approved','paid') THEN
      UPDATE public.affiliate_wallet
        SET pending_balance = GREATEST(pending_balance - OLD.commission_amount, 0),
            available_balance = available_balance + NEW.commission_amount,
            lifetime_earned = lifetime_earned + NEW.commission_amount,
            updated_at = now()
        WHERE affiliate_id = NEW.affiliate_id
        RETURNING available_balance INTO v_bal;
      INSERT INTO public.affiliate_wallet_transactions(affiliate_id, type, amount, balance_after, reference_id, note)
      VALUES (NEW.affiliate_id, 'commission_credit', NEW.commission_amount, COALESCE(v_bal,0), NEW.id, 'Commission approved');
      UPDATE public.affiliates
        SET total_commission = total_commission + NEW.commission_amount,
            updated_at = now()
        WHERE id = NEW.affiliate_id;
      PERFORM public.affiliate_recalculate_tier(NEW.affiliate_id);
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
      UPDATE public.affiliate_wallet
        SET pending_balance = GREATEST(pending_balance - OLD.commission_amount, 0), updated_at = now()
        WHERE affiliate_id = NEW.affiliate_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_commission_status ON public.affiliate_commissions;
CREATE TRIGGER trg_commission_status AFTER INSERT OR UPDATE ON public.affiliate_commissions
FOR EACH ROW EXECUTE FUNCTION public.tg_commission_status();

-- 14) Withdrawal status trigger: hold/refund balance
CREATE OR REPLACE FUNCTION public.tg_withdrawal_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal numeric;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.ensure_affiliate_wallet(NEW.affiliate_id);
    UPDATE public.affiliate_wallet
      SET available_balance = available_balance - NEW.amount, updated_at = now()
      WHERE affiliate_id = NEW.affiliate_id
      RETURNING available_balance INTO v_bal;
    INSERT INTO public.affiliate_wallet_transactions(affiliate_id,type,amount,balance_after,reference_id,note)
    VALUES (NEW.affiliate_id,'withdrawal_debit',-NEW.amount,COALESCE(v_bal,0),NEW.id,'Withdrawal requested');
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
    IF NEW.status = 'rejected' AND OLD.status IN ('pending','approved') THEN
      UPDATE public.affiliate_wallet
        SET available_balance = available_balance + OLD.amount, updated_at = now()
        WHERE affiliate_id = NEW.affiliate_id
        RETURNING available_balance INTO v_bal;
      INSERT INTO public.affiliate_wallet_transactions(affiliate_id,type,amount,balance_after,reference_id,note)
      VALUES (NEW.affiliate_id,'withdrawal_refund',OLD.amount,COALESCE(v_bal,0),NEW.id,'Withdrawal rejected — refunded');
    ELSIF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
      UPDATE public.affiliate_wallet
        SET lifetime_withdrawn = lifetime_withdrawn + OLD.amount, updated_at = now()
        WHERE affiliate_id = NEW.affiliate_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_withdrawal_status ON public.affiliate_withdrawals;
CREATE TRIGGER trg_withdrawal_status AFTER INSERT OR UPDATE ON public.affiliate_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.tg_withdrawal_status();

-- 15) Pay subscription with wallet — RPC
CREATE OR REPLACE FUNCTION public.affiliate_pay_subscription(_plan_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_aff record;
  v_plan record;
  v_bal numeric;
  v_sub_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  SELECT * INTO v_aff FROM public.affiliates WHERE user_id = v_uid LIMIT 1;
  IF v_aff IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_an_affiliate'); END IF;
  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = _plan_id AND is_active LIMIT 1;
  IF v_plan IS NULL THEN RETURN jsonb_build_object('ok',false,'error','invalid_plan'); END IF;
  PERFORM public.ensure_affiliate_wallet(v_aff.id);
  SELECT available_balance INTO v_bal FROM public.affiliate_wallet WHERE affiliate_id = v_aff.id;
  IF v_bal < v_plan.price_bdt THEN
    RETURN jsonb_build_object('ok',false,'error','insufficient_balance','available',v_bal,'price',v_plan.price_bdt);
  END IF;
  -- debit wallet
  UPDATE public.affiliate_wallet
    SET available_balance = available_balance - v_plan.price_bdt,
        lifetime_spent_on_subscription = lifetime_spent_on_subscription + v_plan.price_bdt,
        updated_at = now()
    WHERE affiliate_id = v_aff.id RETURNING available_balance INTO v_bal;
  -- create subscription
  INSERT INTO public.subscriptions(user_id, plan_id, starts_at, expires_at, status)
  VALUES (v_uid, v_plan.id, now(), now() + (v_plan.duration_days || ' days')::interval, 'active')
  RETURNING id INTO v_sub_id;
  INSERT INTO public.affiliate_wallet_transactions(affiliate_id,type,amount,balance_after,reference_id,note)
  VALUES (v_aff.id,'subscription_debit',-v_plan.price_bdt,v_bal,v_sub_id,'Paid subscription with balance');
  RETURN jsonb_build_object('ok',true,'subscription_id',v_sub_id,'remaining_balance',v_bal);
END $$;

GRANT EXECUTE ON FUNCTION public.affiliate_pay_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.affiliate_recalculate_tier(uuid) TO authenticated;