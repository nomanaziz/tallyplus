
-- 1. Partial payments table
CREATE TABLE public.consumer_loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.consumer_loans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_via text NOT NULL DEFAULT 'cash',
  note text,
  paid_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clp_loan ON public.consumer_loan_payments(loan_id);
CREATE INDEX idx_clp_user ON public.consumer_loan_payments(user_id);
ALTER TABLE public.consumer_loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own clp select" ON public.consumer_loan_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own clp insert" ON public.consumer_loan_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own clp update" ON public.consumer_loan_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own clp delete" ON public.consumer_loan_payments FOR DELETE USING (auth.uid() = user_id);

-- 2. paid_amount on consumer_loans
ALTER TABLE public.consumer_loans ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;

-- 3. Sync trigger: maintains paid_amount + is_settled
CREATE OR REPLACE FUNCTION public.tg_clp_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan_id uuid;
  v_total numeric;
  v_amount numeric;
BEGIN
  v_loan_id := COALESCE(NEW.loan_id, OLD.loan_id);
  SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.consumer_loan_payments WHERE loan_id = v_loan_id;
  SELECT amount INTO v_amount FROM public.consumer_loans WHERE id = v_loan_id;
  UPDATE public.consumer_loans
    SET paid_amount = v_total,
        is_settled  = (v_total >= COALESCE(v_amount, 0)),
        settled_at  = CASE WHEN v_total >= COALESCE(v_amount, 0) THEN COALESCE(settled_at, now()) ELSE NULL END,
        updated_at  = now()
    WHERE id = v_loan_id;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_clp_sync
AFTER INSERT OR UPDATE OR DELETE ON public.consumer_loan_payments
FOR EACH ROW EXECUTE FUNCTION public.tg_clp_sync();

-- 4. Consumer cash movements
CREATE TABLE public.consumer_cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  source text NOT NULL,
  ref_loan_id uuid NULL,
  ref_payment_id uuid NULL,
  note text,
  tx_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ccm_user ON public.consumer_cash_movements(user_id);
CREATE INDEX idx_ccm_loan ON public.consumer_cash_movements(ref_loan_id);
CREATE INDEX idx_ccm_payment ON public.consumer_cash_movements(ref_payment_id);
ALTER TABLE public.consumer_cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ccm select" ON public.consumer_cash_movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own ccm insert" ON public.consumer_cash_movements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ccm update" ON public.consumer_cash_movements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own ccm delete" ON public.consumer_cash_movements FOR DELETE USING (auth.uid() = user_id);

-- 5. Trigger: loan create/delete → cash movement
CREATE OR REPLACE FUNCTION public.tg_loan_cash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'borrowed' THEN
      INSERT INTO public.consumer_cash_movements(user_id, amount, direction, source, ref_loan_id, note, tx_date)
      VALUES (NEW.user_id, NEW.amount, 'in', 'loan_borrowed', NEW.id,
              'ঋণ নিলাম — ' || NEW.party_name, NEW.loan_date);
    ELSIF NEW.type = 'lent' THEN
      INSERT INTO public.consumer_cash_movements(user_id, amount, direction, source, ref_loan_id, note, tx_date)
      VALUES (NEW.user_id, NEW.amount, 'out', 'loan_lent', NEW.id,
              'ধার দিলাম — ' || NEW.party_name, NEW.loan_date);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.consumer_cash_movements WHERE ref_loan_id = OLD.id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_loan_cash
AFTER INSERT OR DELETE ON public.consumer_loans
FOR EACH ROW EXECUTE FUNCTION public.tg_loan_cash();

-- 6. Trigger: payment → cash movement
CREATE OR REPLACE FUNCTION public.tg_clp_cash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_type text; v_party text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT type, party_name INTO v_type, v_party FROM public.consumer_loans WHERE id = NEW.loan_id;
    IF v_type = 'lent' THEN
      INSERT INTO public.consumer_cash_movements(user_id, amount, direction, source, ref_loan_id, ref_payment_id, note, tx_date)
      VALUES (NEW.user_id, NEW.amount, 'in', 'loan_repay_received', NEW.loan_id, NEW.id,
              'পাওনা ফেরত — ' || COALESCE(v_party, ''), NEW.paid_date);
    ELSIF v_type = 'borrowed' THEN
      INSERT INTO public.consumer_cash_movements(user_id, amount, direction, source, ref_loan_id, ref_payment_id, note, tx_date)
      VALUES (NEW.user_id, NEW.amount, 'out', 'loan_repay_paid', NEW.loan_id, NEW.id,
              'দেনা পরিশোধ — ' || COALESCE(v_party, ''), NEW.paid_date);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.consumer_cash_movements WHERE ref_payment_id = OLD.id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_clp_cash
AFTER INSERT OR DELETE ON public.consumer_loan_payments
FOR EACH ROW EXECUTE FUNCTION public.tg_clp_cash();

-- 7. RPC: cash summary
CREATE OR REPLACE FUNCTION public.consumer_cash_summary()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'cash_in',  COALESCE(SUM(amount) FILTER (WHERE direction = 'in'),  0),
    'cash_out', COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0),
    'balance',  COALESCE(SUM(CASE WHEN direction='in' THEN amount ELSE -amount END), 0)
  )
  FROM public.consumer_cash_movements
  WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.consumer_cash_summary() TO authenticated;

-- 8. Backfill cash movements from existing loans (idempotent)
INSERT INTO public.consumer_cash_movements(user_id, amount, direction, source, ref_loan_id, note, tx_date)
SELECT user_id, amount,
       CASE WHEN type='borrowed' THEN 'in' ELSE 'out' END,
       CASE WHEN type='borrowed' THEN 'loan_borrowed' ELSE 'loan_lent' END,
       id,
       CASE WHEN type='borrowed' THEN 'ঋণ নিলাম — ' ELSE 'ধার দিলাম — ' END || party_name,
       loan_date
FROM public.consumer_loans
WHERE NOT EXISTS (
  SELECT 1 FROM public.consumer_cash_movements ccm
  WHERE ccm.ref_loan_id = consumer_loans.id AND ccm.ref_payment_id IS NULL
);

-- 9. Backfill paid_amount from already-settled rows (treat full settlement as one payment)
INSERT INTO public.consumer_loan_payments(loan_id, user_id, amount, paid_via, paid_date, note)
SELECT id, user_id, amount, 'cash', COALESCE(settled_at::date, current_date), 'Auto-imported settlement'
FROM public.consumer_loans
WHERE is_settled = true
  AND NOT EXISTS (SELECT 1 FROM public.consumer_loan_payments p WHERE p.loan_id = consumer_loans.id);

-- 10. Cleanup: remove loan-related rows from personal income/expense ledger
DELETE FROM public.consumer_transactions WHERE source_loan_id IS NOT NULL;
