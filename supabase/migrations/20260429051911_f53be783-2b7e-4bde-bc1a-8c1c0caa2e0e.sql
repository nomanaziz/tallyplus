ALTER TABLE public.products ADD COLUMN IF NOT EXISTS manufacturing_date date;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS expiry_date date;