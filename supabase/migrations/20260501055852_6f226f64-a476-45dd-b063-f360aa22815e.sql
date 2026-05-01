-- 1. Add source_wishlist_id to consumer_transactions
ALTER TABLE public.consumer_transactions
  ADD COLUMN IF NOT EXISTS source_wishlist_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_consumer_tx_wishlist
  ON public.consumer_transactions (user_id, source_wishlist_id)
  WHERE source_wishlist_id IS NOT NULL;

-- 2. consumer_loans table
DO $$ BEGIN
  CREATE TYPE public.loan_type AS ENUM ('lent','borrowed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.consumer_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  party_name text NOT NULL,
  party_phone text,
  type public.loan_type NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  loan_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  note text,
  is_settled boolean NOT NULL DEFAULT false,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consumer_loans_user ON public.consumer_loans(user_id, is_settled, loan_date DESC);

ALTER TABLE public.consumer_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loans select own" ON public.consumer_loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "loans insert own" ON public.consumer_loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "loans update own" ON public.consumer_loans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "loans delete own" ON public.consumer_loans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_consumer_loans_updated
  BEFORE UPDATE ON public.consumer_loans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Consumer history subscription plans
INSERT INTO public.subscription_plans (code, name_bn, name_en, description_bn, price_bdt, duration_days, is_active, max_shops)
VALUES
  ('consumer_history_1y', '১ বছরের আয়-ব্যয় হিস্ট্রি', 'Consumer History 1 Year', 'পূর্বের ১ বছরের আয়-ব্যয়ের বিস্তারিত হিস্ট্রি দেখার সুবিধা', 99, 365, true, 0),
  ('consumer_history_5y', '৫ বছরের আয়-ব্যয় হিস্ট্রি', 'Consumer History 5 Years', 'পূর্বের ৫ বছরের আয়-ব্যয়ের বিস্তারিত হিস্ট্রি দেখার সুবিধা', 399, 365, true, 0),
  ('consumer_history_10y', '১০ বছরের আয়-ব্যয় হিস্ট্রি', 'Consumer History 10 Years', 'পূর্বের ১০ বছরের আয়-ব্যয়ের বিস্তারিত হিস্ট্রি দেখার সুবিধা', 699, 365, true, 0)
ON CONFLICT (code) DO NOTHING;