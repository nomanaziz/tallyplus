ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS denominations jsonb NOT NULL DEFAULT '{}'::jsonb;