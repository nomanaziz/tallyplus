-- Consumer transactions (income/expense)
CREATE TABLE public.consumer_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  category TEXT,
  note TEXT,
  tx_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consumer_tx_user_date ON public.consumer_transactions(user_id, tx_date DESC);

ALTER TABLE public.consumer_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ct_owner_select" ON public.consumer_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ct_owner_insert" ON public.consumer_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ct_owner_update" ON public.consumer_transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ct_owner_delete" ON public.consumer_transactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_consumer_tx_updated_at
  BEFORE UPDATE ON public.consumer_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Consumer notes
CREATE TABLE public.consumer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consumer_notes_user ON public.consumer_notes(user_id, updated_at DESC);

ALTER TABLE public.consumer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cn_owner_select" ON public.consumer_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cn_owner_insert" ON public.consumer_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cn_owner_update" ON public.consumer_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cn_owner_delete" ON public.consumer_notes
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_consumer_notes_updated_at
  BEFORE UPDATE ON public.consumer_notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
