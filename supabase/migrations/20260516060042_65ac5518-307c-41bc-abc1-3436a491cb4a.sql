CREATE TABLE public.consumer_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_name TEXT NOT NULL,
  month DATE NOT NULL,
  amount_limit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_name, month)
);

ALTER TABLE public.consumer_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own budgets" ON public.consumer_budgets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own budgets" ON public.consumer_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own budgets" ON public.consumer_budgets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own budgets" ON public.consumer_budgets
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_consumer_budgets_user_month ON public.consumer_budgets(user_id, month);

CREATE TRIGGER trg_consumer_budgets_updated_at
  BEFORE UPDATE ON public.consumer_budgets
  FOR EACH ROW EXECUTE FUNCTION public.tg_product_brands_updated_at();