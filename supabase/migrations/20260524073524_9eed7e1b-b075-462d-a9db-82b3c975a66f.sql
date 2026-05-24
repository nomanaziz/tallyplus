
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cylinder_type text,
  ADD COLUMN IF NOT EXISTS empty_cost_price numeric,
  ADD COLUMN IF NOT EXISTS empty_sale_price numeric,
  ADD COLUMN IF NOT EXISTS empty_wholesale_price numeric,
  ADD COLUMN IF NOT EXISTS empty_agent_price numeric;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_cylinder_type_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_cylinder_type_check
    CHECK (cylinder_type IS NULL OR cylinder_type IN ('full','empty'));
