-- 1) Add contact_kind column to customers (for distinguishing employees)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS contact_kind text NOT NULL DEFAULT 'customer';

-- Constraint: only customer or employee
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_contact_kind_check') THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_contact_kind_check
      CHECK (contact_kind IN ('customer','employee'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_shop_kind ON public.customers (shop_id, contact_kind) WHERE deleted_at IS NULL;

-- 2) Trigger: auto-update due_balance on payments insert/update/delete
CREATE OR REPLACE FUNCTION public.tg_payments_sync_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric;
BEGIN
  -- Reverse old effect
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    v_delta := CASE WHEN OLD.direction = 'in' THEN OLD.amount ELSE -OLD.amount END;
    -- direction 'in' = received money from customer → reduced their due (we add it back on reverse)
    -- direction 'out' = paid money to supplier OR advance to customer
    IF OLD.customer_id IS NOT NULL THEN
      UPDATE public.customers
        SET due_balance = COALESCE(due_balance, 0) + v_delta
        WHERE id = OLD.customer_id;
    ELSIF OLD.supplier_id IS NOT NULL THEN
      -- For supplier: 'out' = paid them → reduced what we owe (reverse: add back)
      -- 'in' = took back from them → increased what we owe (reverse: subtract)
      UPDATE public.suppliers
        SET due_balance = COALESCE(due_balance, 0) + (CASE WHEN OLD.direction = 'out' THEN OLD.amount ELSE -OLD.amount END)
        WHERE id = OLD.supplier_id;
    END IF;
  END IF;

  -- Apply new effect
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.customer_id IS NOT NULL THEN
      -- Received from customer (in) → reduce their due. Given to customer (out) → increase due (or create advance if negative)
      UPDATE public.customers
        SET due_balance = COALESCE(due_balance, 0) + (CASE WHEN NEW.direction = 'in' THEN -NEW.amount ELSE NEW.amount END)
        WHERE id = NEW.customer_id;
    ELSIF NEW.supplier_id IS NOT NULL THEN
      -- Paid supplier (out) → reduce what we owe. Got back from supplier (in) → increase what we owe.
      UPDATE public.suppliers
        SET due_balance = COALESCE(due_balance, 0) + (CASE WHEN NEW.direction = 'out' THEN -NEW.amount ELSE NEW.amount END)
        WHERE id = NEW.supplier_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS payments_sync_balance ON public.payments;
CREATE TRIGGER payments_sync_balance
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tg_payments_sync_balance();