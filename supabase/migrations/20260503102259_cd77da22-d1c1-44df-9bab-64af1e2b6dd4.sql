DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketplace_orders_shop_id_fkey'
      AND conrelid = 'public.marketplace_orders'::regclass
  ) THEN
    ALTER TABLE public.marketplace_orders
      ADD CONSTRAINT marketplace_orders_shop_id_fkey
      FOREIGN KEY (shop_id)
      REFERENCES public.shops(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mp_orders_shop_id
  ON public.marketplace_orders(shop_id);

ALTER TABLE public.consumer_transactions
  ADD COLUMN IF NOT EXISTS source_loan_id uuid,
  ADD COLUMN IF NOT EXISTS source_loan_event text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'consumer_transactions_source_loan_event_check'
      AND conrelid = 'public.consumer_transactions'::regclass
  ) THEN
    ALTER TABLE public.consumer_transactions
      ADD CONSTRAINT consumer_transactions_source_loan_event_check
      CHECK (
        source_loan_event IS NULL
        OR source_loan_event IN ('created', 'settled')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_consumer_tx_loan_event
  ON public.consumer_transactions (user_id, source_loan_id, source_loan_event)
  WHERE source_loan_id IS NOT NULL AND source_loan_event IS NOT NULL;