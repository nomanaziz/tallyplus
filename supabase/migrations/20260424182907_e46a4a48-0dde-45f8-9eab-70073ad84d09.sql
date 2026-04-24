-- Printer settings (one row per shop)
create table public.shop_printer_settings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null unique,
  printer_type text not null default 'inkjet_laser',
  language text not null default 'bn',
  paper_size text,
  font_size int not null default 14,
  footer_text text,
  print_qr boolean not null default false,
  print_discount boolean not null default true,
  print_vat boolean not null default true,
  print_delivery boolean not null default true,
  print_prev_due boolean not null default true,
  print_unit_column boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_printer_settings enable row level security;

create policy "printer settings read shop"
on public.shop_printer_settings for select
using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));

create policy "printer settings write shop"
on public.shop_printer_settings for all
using (public.is_shop_member(auth.uid(), shop_id))
with check (public.is_shop_member(auth.uid(), shop_id));

create trigger shop_printer_settings_updated_at
before update on public.shop_printer_settings
for each row execute function public.tg_set_updated_at();

-- Other income (parallel to expenses)
create table public.other_income (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null,
  source text,
  amount numeric not null,
  note text,
  paid_via public.payment_method not null default 'cash',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.other_income enable row level security;

create policy "income read shop"
on public.other_income for select
using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));

create policy "income write shop"
on public.other_income for all
using (public.is_shop_member(auth.uid(), shop_id))
with check (public.is_shop_member(auth.uid(), shop_id));

create trigger other_income_updated_at
before update on public.other_income
for each row execute function public.tg_set_updated_at();

create index other_income_shop_idx on public.other_income(shop_id, created_at desc);