
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'recharge_server',
  transaction_id text UNIQUE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pt_owner_select" ON public.payment_transactions;
CREATE POLICY "pt_owner_select" ON public.payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "pt_admin_all" ON public.payment_transactions;
CREATE POLICY "pt_admin_all" ON public.payment_transactions
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pt_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pt_status ON public.payment_transactions(status);

DROP TRIGGER IF EXISTS trg_pt_updated_at ON public.payment_transactions;
CREATE TRIGGER trg_pt_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
