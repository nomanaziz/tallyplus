ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_shop_parent
  ON public.categories(shop_id, parent_id);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sub_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_sub_category ON public.products(sub_category_id);