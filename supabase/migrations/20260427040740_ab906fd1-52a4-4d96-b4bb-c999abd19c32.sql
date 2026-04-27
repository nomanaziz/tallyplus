create table if not exists public.sale_adjustments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  type text not null default 'discount',
  amount numeric(12,2) not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_sale_adjustments_sale on public.sale_adjustments(sale_id);
create index if not exists idx_sale_adjustments_shop_created on public.sale_adjustments(shop_id, created_at desc);

alter table public.sale_adjustments enable row level security;

create policy "sale_adj read shop"
on public.sale_adjustments for select
using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));

create policy "sale_adj write shop"
on public.sale_adjustments for all
using (public.is_shop_member(auth.uid(), shop_id))
with check (public.is_shop_member(auth.uid(), shop_id));