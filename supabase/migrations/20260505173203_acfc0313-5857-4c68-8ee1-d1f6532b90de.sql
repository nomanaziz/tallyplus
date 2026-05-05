
-- ============ consumer_accounts ============
CREATE TABLE public.consumer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'cash' CHECK (kind IN ('cash','bank','bkash','nagad','card','other')),
  opening_balance numeric NOT NULL DEFAULT 0,
  color text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consumer_accounts_user ON public.consumer_accounts(user_id) WHERE is_archived = false;
ALTER TABLE public.consumer_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own accounts select" ON public.consumer_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own accounts insert" ON public.consumer_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own accounts update" ON public.consumer_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own accounts delete" ON public.consumer_accounts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_consumer_accounts_updated BEFORE UPDATE ON public.consumer_accounts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ consumer_categories ============
CREATE TABLE public.consumer_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  parent_id uuid REFERENCES public.consumer_categories(id) ON DELETE CASCADE,
  icon text,
  color text,
  is_archived boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consumer_categories_user_kind ON public.consumer_categories(user_id, kind) WHERE is_archived = false;
CREATE INDEX idx_consumer_categories_parent ON public.consumer_categories(parent_id);
ALTER TABLE public.consumer_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cats select" ON public.consumer_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own cats insert" ON public.consumer_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own cats update" ON public.consumer_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own cats delete" ON public.consumer_categories FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_consumer_categories_updated BEFORE UPDATE ON public.consumer_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ consumer_recurring_rules ============
CREATE TABLE public.consumer_recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('income','expense')),
  amount numeric NOT NULL CHECK (amount > 0),
  account_id uuid REFERENCES public.consumer_accounts(id) ON DELETE SET NULL,
  category text,
  subcategory_id uuid REFERENCES public.consumer_categories(id) ON DELETE SET NULL,
  note text,
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 31),
  next_run_date date NOT NULL,
  last_run_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consumer_recurring_user ON public.consumer_recurring_rules(user_id) WHERE is_active = true;
CREATE INDEX idx_consumer_recurring_due ON public.consumer_recurring_rules(next_run_date) WHERE is_active = true;
ALTER TABLE public.consumer_recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rules select" ON public.consumer_recurring_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own rules insert" ON public.consumer_recurring_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own rules update" ON public.consumer_recurring_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own rules delete" ON public.consumer_recurring_rules FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_consumer_recurring_updated BEFORE UPDATE ON public.consumer_recurring_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ extend consumer_transactions ============
ALTER TABLE public.consumer_transactions
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.consumer_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.consumer_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_group_id uuid,
  ADD COLUMN IF NOT EXISTS recurring_rule_id uuid REFERENCES public.consumer_recurring_rules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_consumer_tx_account ON public.consumer_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_consumer_tx_transfer ON public.consumer_transactions(transfer_group_id);

-- ============ RPC: per-account balances ============
CREATE OR REPLACE FUNCTION public.consumer_account_balances()
RETURNS TABLE(account_id uuid, name text, kind text, color text, balance numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH a AS (
    SELECT id, name, kind, color, opening_balance
    FROM public.consumer_accounts
    WHERE user_id = auth.uid() AND is_archived = false
  ),
  tx AS (
    SELECT account_id,
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS delta
    FROM public.consumer_transactions
    WHERE user_id = auth.uid() AND account_id IS NOT NULL
    GROUP BY account_id
  )
  SELECT a.id, a.name, a.kind, a.color,
    a.opening_balance + COALESCE(tx.delta, 0) AS balance
  FROM a LEFT JOIN tx ON tx.account_id = a.id
  ORDER BY a.name;
$$;

-- ============ RPC: materialise due recurring rules for the caller ============
CREATE OR REPLACE FUNCTION public.consumer_run_recurring()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rule record;
  v_count int := 0;
  v_today date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
  v_next date;
BEGIN
  IF v_uid IS NULL THEN RETURN 0; END IF;
  FOR v_rule IN
    SELECT * FROM public.consumer_recurring_rules
    WHERE user_id = v_uid AND is_active = true AND next_run_date <= v_today
    ORDER BY next_run_date ASC
    LIMIT 200
  LOOP
    -- Catch up: insert one tx per missed period, advancing next_run_date forward
    LOOP
      EXIT WHEN v_rule.next_run_date > v_today;
      INSERT INTO public.consumer_transactions(
        user_id, type, amount, category, note, tx_date, account_id, subcategory_id, recurring_rule_id
      ) VALUES (
        v_uid, v_rule.type, v_rule.amount, v_rule.category,
        COALESCE(v_rule.note, '') || ' (অটো)',
        v_rule.next_run_date, v_rule.account_id, v_rule.subcategory_id, v_rule.id
      );
      v_count := v_count + 1;
      v_next := CASE v_rule.frequency
        WHEN 'daily'   THEN v_rule.next_run_date + INTERVAL '1 day'
        WHEN 'weekly'  THEN v_rule.next_run_date + INTERVAL '7 days'
        WHEN 'monthly' THEN v_rule.next_run_date + INTERVAL '1 month'
        WHEN 'yearly'  THEN v_rule.next_run_date + INTERVAL '1 year'
      END::date;
      v_rule.next_run_date := v_next;
    END LOOP;
    UPDATE public.consumer_recurring_rules
      SET next_run_date = v_rule.next_run_date,
          last_run_date = v_today
      WHERE id = v_rule.id;
  END LOOP;
  RETURN v_count;
END;
$$;
