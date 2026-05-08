
ALTER TABLE public.shop_members
  ADD COLUMN IF NOT EXISTS salary numeric,
  ADD COLUMN IF NOT EXISTS nid text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS emergency_phone text;
