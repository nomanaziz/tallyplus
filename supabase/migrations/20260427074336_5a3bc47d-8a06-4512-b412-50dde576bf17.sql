-- Add tracking columns to payment_transactions if missing
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Index for admin log view
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_created
  ON public.payment_transactions (status, created_at DESC);

-- Allow admins to view all payment transactions for follow-up
DROP POLICY IF EXISTS "Admins can view all payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins can view all payment transactions"
  ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow admins to update payment transactions (e.g. add notes / mark resolved)
DROP POLICY IF EXISTS "Admins can update all payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins can update all payment transactions"
  ON public.payment_transactions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));