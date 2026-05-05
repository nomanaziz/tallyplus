create table if not exists public.product_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_bn text,
  shop_id uuid references public.shops(id) on delete cascade,
  is_global boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists product_brands_global_unique
  on public.product_brands (lower(name)) where shop_id is null;
create unique index if not exists product_brands_shop_unique
  on public.product_brands (shop_id, lower(name)) where shop_id is not null;

alter table public.product_brands enable row level security;

create policy "brands read all visible"
  on public.product_brands for select
  using (is_global = true or (shop_id is not null and public.is_shop_member(auth.uid(), shop_id)) or public.is_admin(auth.uid()));

create policy "brands admin manage globals"
  on public.product_brands for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "brands shop members insert own"
  on public.product_brands for insert
  with check (shop_id is not null and public.is_shop_member(auth.uid(), shop_id) and is_global = false);

create policy "brands shop members update own"
  on public.product_brands for update
  using (shop_id is not null and public.is_shop_member(auth.uid(), shop_id))
  with check (shop_id is not null and public.is_shop_member(auth.uid(), shop_id));

create policy "brands shop members delete own"
  on public.product_brands for delete
  using (shop_id is not null and public.is_shop_member(auth.uid(), shop_id));

create or replace function public.tg_product_brands_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger product_brands_set_updated_at
  before update on public.product_brands
  for each row execute function public.tg_product_brands_updated_at();

alter table public.products add column if not exists brand text;