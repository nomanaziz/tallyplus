
DO $$ BEGIN
  CREATE TYPE public.recurring_expense_kind AS ENUM ('fixed','variable','loan');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.recurring_expense_due_status AS ENUM ('pending','paid','skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.recurring_loan_mode AS ENUM ('interest_only','emi');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  kind public.recurring_expense_kind NOT NULL DEFAULT 'fixed',
  amount numeric NOT NULL DEFAULT 0,
  day_of_month smallint NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  start_month date NOT NULL DEFAULT date_trunc('month', now())::date,
  end_month date,
  is_active boolean NOT NULL DEFAULT true,
  loan_principal numeric,
  loan_annual_interest_rate numeric,
  loan_term_months integer,
  loan_start_date date,
  loan_mode public.recurring_loan_mode,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_shop ON public.recurring_expenses(shop_id) WHERE deleted_at IS NULL;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rec_exp read" ON public.recurring_expenses;
CREATE POLICY "rec_exp read" ON public.recurring_expenses FOR SELECT
  USING (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "rec_exp write" ON public.recurring_expenses;
CREATE POLICY "rec_exp write" ON public.recurring_expenses FOR ALL
  USING (is_shop_member(auth.uid(), shop_id))
  WITH CHECK (is_shop_member(auth.uid(), shop_id));

CREATE TABLE IF NOT EXISTS public.recurring_expense_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  recurring_expense_id uuid NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  due_month date NOT NULL,
  bill_amount numeric NOT NULL DEFAULT 0,
  status public.recurring_expense_due_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  paid_via text,
  expense_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurring_expense_id, due_month)
);
CREATE INDEX IF NOT EXISTS idx_rec_dues_shop_status ON public.recurring_expense_dues(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_rec_dues_month ON public.recurring_expense_dues(due_month);
ALTER TABLE public.recurring_expense_dues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rec_dues read" ON public.recurring_expense_dues;
CREATE POLICY "rec_dues read" ON public.recurring_expense_dues FOR SELECT
  USING (is_shop_member(auth.uid(), shop_id) OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "rec_dues write" ON public.recurring_expense_dues;
CREATE POLICY "rec_dues write" ON public.recurring_expense_dues FOR ALL
  USING (is_shop_member(auth.uid(), shop_id))
  WITH CHECK (is_shop_member(auth.uid(), shop_id));

DROP TRIGGER IF EXISTS trg_rec_exp_updated ON public.recurring_expenses;
CREATE TRIGGER trg_rec_exp_updated BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS trg_rec_dues_updated ON public.recurring_expense_dues;
CREATE TRIGGER trg_rec_dues_updated BEFORE UPDATE ON public.recurring_expense_dues
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.calc_recurring_monthly_amount(
  _kind public.recurring_expense_kind,
  _amount numeric,
  _principal numeric,
  _annual_rate numeric,
  _term_months integer,
  _mode public.recurring_loan_mode
) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE r numeric; pow_v numeric;
BEGIN
  IF _kind <> 'loan' THEN RETURN COALESCE(_amount, 0); END IF;
  IF COALESCE(_principal,0) <= 0 OR COALESCE(_annual_rate,0) < 0 THEN RETURN 0; END IF;
  IF _mode = 'emi' AND COALESCE(_term_months,0) > 0 THEN
    r := _annual_rate / 100.0 / 12.0;
    IF r = 0 THEN RETURN round(_principal / _term_months, 2); END IF;
    pow_v := power(1 + r, _term_months);
    RETURN round(_principal * r * pow_v / (pow_v - 1), 2);
  ELSE
    RETURN round(_principal * (_annual_rate / 100.0 / 12.0), 2);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_recurring_dues_for_shop(_shop_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  this_month date := date_trunc('month', now())::date;
  inserted_count integer := 0;
  amt numeric;
BEGIN
  IF NOT (is_shop_member(auth.uid(), _shop_id) OR is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  FOR rec IN
    SELECT * FROM public.recurring_expenses
    WHERE shop_id = _shop_id AND is_active = true AND deleted_at IS NULL
      AND start_month <= this_month
      AND (end_month IS NULL OR end_month >= this_month)
  LOOP
    amt := public.calc_recurring_monthly_amount(
      rec.kind, rec.amount, rec.loan_principal, rec.loan_annual_interest_rate,
      rec.loan_term_months, rec.loan_mode
    );
    INSERT INTO public.recurring_expense_dues
      (shop_id, recurring_expense_id, due_month, bill_amount, status)
    VALUES (_shop_id, rec.id, this_month, amt, 'pending')
    ON CONFLICT (recurring_expense_id, due_month) DO NOTHING;
    IF FOUND THEN inserted_count := inserted_count + 1; END IF;
  END LOOP;
  RETURN inserted_count;
END $$;
