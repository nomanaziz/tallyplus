ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS advance_payer_phone text,
  ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_amount numeric,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_service_bookings_sale ON public.service_bookings(sale_id);