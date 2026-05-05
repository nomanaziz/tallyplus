alter table public.products
  add column if not exists marketplace_category_id uuid references public.marketplace_categories(id) on delete set null,
  add column if not exists marketplace_subcategory_id uuid references public.marketplace_categories(id) on delete set null;
create index if not exists idx_products_mp_category on public.products(marketplace_category_id);
create index if not exists idx_products_mp_subcategory on public.products(marketplace_subcategory_id);