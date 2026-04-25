alter table public.products
  add column if not exists description text,
  add column if not exists is_marketplace_published boolean not null default false,
  add column if not exists bulk_enabled boolean not null default false,
  add column if not exists bulk_price numeric,
  add column if not exists bulk_min_qty numeric,
  add column if not exists vat_enabled boolean not null default false,
  add column if not exists vat_pct numeric,
  add column if not exists warranty_enabled boolean not null default false,
  add column if not exists warranty_value integer,
  add column if not exists warranty_unit text default 'month',
  add column if not exists discount_enabled boolean not null default false,
  add column if not exists discount_value numeric,
  add column if not exists discount_type text default 'percent';

alter table public.products drop constraint if exists products_warranty_unit_check;
alter table public.products add constraint products_warranty_unit_check check (warranty_unit in ('day','week','month','year'));
alter table public.products drop constraint if exists products_discount_type_check;
alter table public.products add constraint products_discount_type_check check (discount_type in ('percent','flat'));