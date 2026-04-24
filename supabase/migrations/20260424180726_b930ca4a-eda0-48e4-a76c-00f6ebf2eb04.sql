
create table if not exists public.shop_custom_roles (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, name)
);

alter table public.shop_custom_roles enable row level security;

create policy "custom roles read shop"
  on public.shop_custom_roles for select
  using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));

create policy "custom roles owner manage"
  on public.shop_custom_roles for all
  using (
    exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid())
    or public.is_admin(auth.uid())
  )
  with check (
    exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid())
    or public.is_admin(auth.uid())
  );

create trigger shop_custom_roles_set_updated_at
  before update on public.shop_custom_roles
  for each row execute function public.tg_set_updated_at();

alter table public.shop_members
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists custom_role_id uuid references public.shop_custom_roles(id) on delete set null,
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists avatar_url text;
