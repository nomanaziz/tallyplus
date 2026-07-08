ALTER TABLE public.investor_loans
  DROP CONSTRAINT IF EXISTS investor_loans_interest_type_check;

ALTER TABLE public.investor_loans
  ADD CONSTRAINT investor_loans_interest_type_check
  CHECK (interest_type IN ('none','flat','reducing_monthly','profit_share','open'));

CREATE OR REPLACE FUNCTION public.investor_generate_schedule(_loan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  DELETE FROM public.investor_installments WHERE loan_id = _loan_id;

  IF l.interest_type IN ('profit_share', 'open') THEN
    UPDATE public.investor_loans
      SET total_interest = 0,
          total_payable  = l.principal
      WHERE id = _loan_id;
    RETURN;
  END IF;

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
  ELSE
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
$function$;