
-- Investors table
CREATE TABLE public.investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  source_type text NOT NULL DEFAULT 'personal' CHECK (source_type IN ('bank','somiti','personal','other')),
  source_name text,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investors TO authenticated;
GRANT ALL ON public.investors TO service_role;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_select ON public.investors FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY inv_modify ON public.investors FOR ALL TO authenticated USING (public.is_shop_member(auth.uid(), shop_id)) WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE INDEX investors_shop_idx ON public.investors(shop_id);

-- Investor loans
CREATE TABLE public.investor_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  principal numeric(14,2) NOT NULL CHECK (principal > 0),
  taken_at date NOT NULL DEFAULT CURRENT_DATE,
  interest_type text NOT NULL DEFAULT 'none' CHECK (interest_type IN ('none','flat','reducing_monthly')),
  interest_rate numeric(6,3) NOT NULL DEFAULT 0, -- annual %
  tenure_months integer NOT NULL CHECK (tenure_months > 0),
  installment_day smallint NOT NULL DEFAULT 1 CHECK (installment_day BETWEEN 1 AND 28),
  first_due_date date NOT NULL,
  total_payable numeric(14,2) NOT NULL DEFAULT 0,
  total_interest numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_loans TO authenticated;
GRANT ALL ON public.investor_loans TO service_role;
ALTER TABLE public.investor_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY invl_select ON public.investor_loans FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY invl_modify ON public.investor_loans FOR ALL TO authenticated USING (public.is_shop_member(auth.uid(), shop_id)) WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE INDEX invl_shop_idx ON public.investor_loans(shop_id);
CREATE INDEX invl_investor_idx ON public.investor_loans(investor_id);

-- Installments schedule
CREATE TABLE public.investor_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  loan_id uuid NOT NULL REFERENCES public.investor_loans(id) ON DELETE CASCADE,
  seq_no integer NOT NULL,
  due_date date NOT NULL,
  principal_part numeric(14,2) NOT NULL DEFAULT 0,
  interest_part numeric(14,2) NOT NULL DEFAULT 0,
  total_due numeric(14,2) NOT NULL,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_at date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(loan_id, seq_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_installments TO authenticated;
GRANT ALL ON public.investor_installments TO service_role;
ALTER TABLE public.investor_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY invi_select ON public.investor_installments FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY invi_modify ON public.investor_installments FOR ALL TO authenticated USING (public.is_shop_member(auth.uid(), shop_id)) WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE INDEX invi_loan_idx ON public.investor_installments(loan_id);
CREATE INDEX invi_shop_due_idx ON public.investor_installments(shop_id, due_date);

-- Payments
CREATE TABLE public.investor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  loan_id uuid NOT NULL REFERENCES public.investor_loans(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES public.investor_installments(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  principal_part numeric(14,2) NOT NULL DEFAULT 0,
  interest_part numeric(14,2) NOT NULL DEFAULT 0,
  paid_at date NOT NULL DEFAULT CURRENT_DATE,
  method text NOT NULL DEFAULT 'cash',
  expense_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_payments TO authenticated;
GRANT ALL ON public.investor_payments TO service_role;
ALTER TABLE public.investor_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY invp_select ON public.investor_payments FOR SELECT TO authenticated USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY invp_modify ON public.investor_payments FOR ALL TO authenticated USING (public.is_shop_member(auth.uid(), shop_id)) WITH CHECK (public.is_shop_member(auth.uid(), shop_id));
CREATE INDEX invp_loan_idx ON public.investor_payments(loan_id);
CREATE INDEX invp_shop_idx ON public.investor_payments(shop_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.investor_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER investors_touch BEFORE UPDATE ON public.investors FOR EACH ROW EXECUTE FUNCTION public.investor_touch_updated_at();
CREATE TRIGGER investor_loans_touch BEFORE UPDATE ON public.investor_loans FOR EACH ROW EXECUTE FUNCTION public.investor_touch_updated_at();
CREATE TRIGGER investor_installments_touch BEFORE UPDATE ON public.investor_installments FOR EACH ROW EXECUTE FUNCTION public.investor_touch_updated_at();

-- Function to generate installment schedule for a loan
CREATE OR REPLACE FUNCTION public.investor_generate_schedule(_loan_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l record;
  i integer;
  due date;
  emi numeric(14,2);
  interest_total numeric(14,2);
  principal_part numeric(14,2);
  interest_part numeric(14,2);
  remaining numeric(14,2);
  monthly_rate numeric(14,6);
  sum_principal numeric(14,2) := 0;
  sum_interest numeric(14,2) := 0;
BEGIN
  SELECT * INTO l FROM public.investor_loans WHERE id = _loan_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Clear any prior schedule
  DELETE FROM public.investor_installments WHERE loan_id = _loan_id;

  IF l.interest_type = 'none' OR l.interest_rate = 0 THEN
    emi := ROUND(l.principal / l.tenure_months, 2);
    interest_total := 0;
    FOR i IN 1..l.tenure_months LOOP
      due := (l.first_due_date + ((i-1) || ' months')::interval)::date;
      principal_part := CASE WHEN i = l.tenure_months THEN l.principal - sum_principal ELSE emi END;
      sum_principal := sum_principal + principal_part;
      INSERT INTO public.investor_installments(shop_id, loan_id, seq_no, due_date, principal_part, interest_part, total_due)
      VALUES (l.shop_id, l.id, i, due, principal_part, 0, principal_part);
    END LOOP;
  ELSIF l.interest_type = 'flat' THEN
    -- flat annual %: total interest = principal * rate/100 * tenure_months/12
    interest_total := ROUND(l.principal * l.interest_rate / 100.0 * l.tenure_months / 12.0, 2);
    emi := ROUND((l.principal + interest_total) / l.tenure_months, 2);
    principal_part := ROUND(l.principal / l.tenure_months, 2);
    interest_part := ROUND(interest_total / l.tenure_months, 2);
    FOR i IN 1..l.tenure_months LOOP
      due := (l.first_due_date + ((i-1) || ' months')::interval)::date;
      IF i = l.tenure_months THEN
        principal_part := l.principal - sum_principal;
        interest_part := interest_total - sum_interest;
      END IF;
      sum_principal := sum_principal + principal_part;
      sum_interest := sum_interest + interest_part;
      INSERT INTO public.investor_installments(shop_id, loan_id, seq_no, due_date, principal_part, interest_part, total_due)
      VALUES (l.shop_id, l.id, i, due, principal_part, interest_part, principal_part + interest_part);
    END LOOP;
  ELSE -- reducing_monthly (standard EMI)
    monthly_rate := l.interest_rate / 100.0 / 12.0;
    IF monthly_rate = 0 THEN
      emi := ROUND(l.principal / l.tenure_months, 2);
    ELSE
      emi := ROUND(l.principal * monthly_rate * power(1 + monthly_rate, l.tenure_months) / (power(1 + monthly_rate, l.tenure_months) - 1), 2);
    END IF;
    remaining := l.principal;
    FOR i IN 1..l.tenure_months LOOP
      due := (l.first_due_date + ((i-1) || ' months')::interval)::date;
      interest_part := ROUND(remaining * monthly_rate, 2);
      principal_part := emi - interest_part;
      IF i = l.tenure_months THEN
        principal_part := remaining;
      END IF;
      remaining := remaining - principal_part;
      sum_interest := sum_interest + interest_part;
      INSERT INTO public.investor_installments(shop_id, loan_id, seq_no, due_date, principal_part, interest_part, total_due)
      VALUES (l.shop_id, l.id, i, due, principal_part, interest_part, principal_part + interest_part);
    END LOOP;
    interest_total := sum_interest;
  END IF;

  UPDATE public.investor_loans
    SET total_interest = interest_total,
        total_payable = l.principal + interest_total
    WHERE id = _loan_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.investor_generate_schedule(uuid) TO authenticated;

-- Trigger: auto generate schedule when loan inserted
CREATE OR REPLACE FUNCTION public.investor_loans_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.investor_generate_schedule(NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER investor_loans_after_insert_trg AFTER INSERT ON public.investor_loans
FOR EACH ROW EXECUTE FUNCTION public.investor_loans_after_insert();
