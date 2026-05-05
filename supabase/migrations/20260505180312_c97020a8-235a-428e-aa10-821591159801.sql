-- 1. New columns
ALTER TABLE public.consumer_loans
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.consumer_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.consumer_loan_payments
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.consumer_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.consumer_transactions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS source_loan_id uuid REFERENCES public.consumer_loans(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_loan_payment_id uuid REFERENCES public.consumer_loan_payments(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_consumer_tx_loan ON public.consumer_transactions(source_loan_id) WHERE source_loan_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_consumer_tx_loan_payment ON public.consumer_transactions(source_loan_payment_id) WHERE source_loan_payment_id IS NOT NULL;

-- 2. Loan creation trigger -> creates a hidden tx so account balance moves
CREATE OR REPLACE FUNCTION public.tg_consumer_loan_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_kind text;
BEGIN
  IF NEW.account_id IS NULL THEN
    RETURN NEW; -- nothing to record if no account selected
  END IF;

  IF NEW.type = 'lent' THEN
    -- gave money out: account decreases (expense-like flow), but kind=loan_out so excluded from income/expense reports
    v_type := 'expense';
    v_kind := 'loan_out';
  ELSE -- borrowed
    v_type := 'income';
    v_kind := 'loan_in';
  END IF;

  INSERT INTO public.consumer_transactions(user_id, type, amount, category, note, tx_date, account_id, kind, source_loan_id)
  VALUES (
    NEW.user_id, v_type, NEW.amount,
    CASE WHEN NEW.type='lent' THEN 'ধার দেওয়া' ELSE 'ধার নেওয়া' END,
    'ধার: ' || COALESCE(NEW.party_name, ''),
    NEW.loan_date, NEW.account_id, v_kind, NEW.id
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_consumer_loan_movement ON public.consumer_loans;
CREATE TRIGGER trg_consumer_loan_movement
  AFTER INSERT ON public.consumer_loans
  FOR EACH ROW EXECUTE FUNCTION public.tg_consumer_loan_movement();

-- 3. Loan repayment trigger
CREATE OR REPLACE FUNCTION public.tg_consumer_loan_payment_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan record;
  v_type text;
  v_kind text;
BEGIN
  IF NEW.account_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_loan FROM public.consumer_loans WHERE id = NEW.loan_id LIMIT 1;
  IF v_loan IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_loan.type = 'lent' THEN
    -- party is repaying me: cash comes in
    v_type := 'income';
    v_kind := 'loan_repay_in';
  ELSE
    -- I'm repaying borrowed money: cash goes out
    v_type := 'expense';
    v_kind := 'loan_repay_out';
  END IF;

  INSERT INTO public.consumer_transactions(user_id, type, amount, category, note, tx_date, account_id, kind, source_loan_payment_id)
  VALUES (
    v_loan.user_id, v_type, NEW.amount,
    CASE WHEN v_loan.type='lent' THEN 'ধার ফেরত পেলাম' ELSE 'ধার পরিশোধ' END,
    'ধার: ' || COALESCE(v_loan.party_name, ''),
    NEW.paid_date, NEW.account_id, v_kind, NEW.id
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_consumer_loan_payment_movement ON public.consumer_loan_payments;
CREATE TRIGGER trg_consumer_loan_payment_movement
  AFTER INSERT ON public.consumer_loan_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_consumer_loan_payment_movement();