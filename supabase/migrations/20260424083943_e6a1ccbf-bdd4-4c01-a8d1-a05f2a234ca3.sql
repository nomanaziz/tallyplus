
-- ============= ENUMS =============
create type public.app_role as enum ('admin', 'owner', 'manager', 'cashier');
create type public.subscription_status as enum ('active', 'expired', 'cancelled');
create type public.subscription_request_status as enum ('pending', 'approved', 'rejected');
create type public.payment_method as enum ('cash', 'bkash', 'nagad', 'rocket', 'bank', 'card', 'due', 'other');
create type public.sale_status as enum ('completed', 'draft', 'returned', 'cancelled');

-- ============= TIMESTAMP HELPER =============
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============= USER ROLES =============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'admin')
$$;

create policy "users read own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "admin manage roles" on public.user_roles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ============= PROFILES =============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  full_name text,
  language text not null default 'bn',
  pin_hash text,
  avatar_url text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create trigger tg_profiles_upd before update on public.profiles for each row execute function public.tg_set_updated_at();

create policy "read own profile" on public.profiles for select using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id or public.is_admin(auth.uid()));

-- Auto-create profile + assign default 'owner' role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, full_name)
    values (new.id, new.phone, coalesce(new.raw_user_meta_data->>'full_name', ''))
    on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'owner') on conflict do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============= SHOPS =============
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique,
  logo_url text,
  address text,
  phone text,
  currency text not null default 'BDT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.shops enable row level security;
create trigger tg_shops_upd before update on public.shops for each row execute function public.tg_set_updated_at();

create table public.shop_members (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'cashier',
  created_at timestamptz not null default now(),
  unique (shop_id, user_id)
);
alter table public.shop_members enable row level security;

create or replace function public.is_shop_member(_user_id uuid, _shop_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shops where id = _shop_id and owner_id = _user_id
    union
    select 1 from public.shop_members where shop_id = _shop_id and user_id = _user_id
  )
$$;

create or replace function public.shop_role(_user_id uuid, _shop_id uuid)
returns public.app_role language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.shops where id = _shop_id and owner_id = _user_id) then 'owner'::public.app_role
    else (select role from public.shop_members where shop_id = _shop_id and user_id = _user_id limit 1)
  end
$$;

create policy "shops read own" on public.shops for select using (owner_id = auth.uid() or public.is_shop_member(auth.uid(), id) or public.is_admin(auth.uid()));
create policy "shops insert own" on public.shops for insert with check (owner_id = auth.uid());
create policy "shops update own" on public.shops for update using (owner_id = auth.uid() or public.is_admin(auth.uid()));
create policy "shops delete own" on public.shops for delete using (owner_id = auth.uid() or public.is_admin(auth.uid()));

create policy "members read" on public.shop_members for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "members manage by owner" on public.shop_members for all
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()) or public.is_admin(auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()) or public.is_admin(auth.uid()));

-- ============= SUBSCRIPTIONS =============
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_bn text not null,
  name_en text not null,
  price_bdt numeric(10,2) not null,
  duration_days int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;
create trigger tg_plans_upd before update on public.subscription_plans for each row execute function public.tg_set_updated_at();
create policy "plans public read" on public.subscription_plans for select using (true);
create policy "plans admin write" on public.subscription_plans for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status public.subscription_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create trigger tg_subs_upd before update on public.subscriptions for each row execute function public.tg_set_updated_at();
create policy "subs read own" on public.subscriptions for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "subs admin write" on public.subscriptions for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  payment_method public.payment_method not null default 'bkash',
  txn_id text,
  proof_url text,
  status public.subscription_request_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscription_requests enable row level security;
create trigger tg_subreq_upd before update on public.subscription_requests for each row execute function public.tg_set_updated_at();
create policy "subreq read own" on public.subscription_requests for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "subreq insert own" on public.subscription_requests for insert with check (user_id = auth.uid());
create policy "subreq admin update" on public.subscription_requests for update using (public.is_admin(auth.uid()));

create or replace function public.has_active_subscription(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.subscriptions where user_id = _user_id and status = 'active' and expires_at > now())
$$;

-- ============= CATEGORIES & PRODUCTS =============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create trigger tg_cat_upd before update on public.categories for each row execute function public.tg_set_updated_at();
create policy "cat read shop" on public.categories for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "cat write shop" on public.categories for all using (public.is_shop_member(auth.uid(), shop_id)) with check (public.is_shop_member(auth.uid(), shop_id));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  sku text,
  barcode text,
  unit text default 'pcs',
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  stock numeric(12,3) not null default 0,
  low_stock_alert numeric(12,3) default 5,
  expiry_date date,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.products enable row level security;
create trigger tg_prod_upd before update on public.products for each row execute function public.tg_set_updated_at();
create index on public.products(shop_id);
create policy "prod read shop" on public.products for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "prod write shop" on public.products for all using (public.is_shop_member(auth.uid(), shop_id)) with check (public.is_shop_member(auth.uid(), shop_id));

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty numeric(12,3) not null,
  type text not null check (type in ('in','out','adjust')),
  ref_table text,
  ref_id uuid,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.stock_movements enable row level security;
create policy "stock read shop" on public.stock_movements for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "stock write shop" on public.stock_movements for insert with check (public.is_shop_member(auth.uid(), shop_id));

-- ============= CONTACTS =============
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  due_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.customers enable row level security;
create trigger tg_cust_upd before update on public.customers for each row execute function public.tg_set_updated_at();
create policy "cust read shop" on public.customers for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "cust write shop" on public.customers for all using (public.is_shop_member(auth.uid(), shop_id)) with check (public.is_shop_member(auth.uid(), shop_id));

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  due_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.suppliers enable row level security;
create trigger tg_sup_upd before update on public.suppliers for each row execute function public.tg_set_updated_at();
create policy "sup read shop" on public.suppliers for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "sup write shop" on public.suppliers for all using (public.is_shop_member(auth.uid(), shop_id)) with check (public.is_shop_member(auth.uid(), shop_id));

-- ============= SALES =============
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_no text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  due numeric(12,2) not null default 0,
  payment_method public.payment_method not null default 'cash',
  status public.sale_status not null default 'completed',
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.sales enable row level security;
create trigger tg_sales_upd before update on public.sales for each row execute function public.tg_set_updated_at();
create index on public.sales(shop_id, created_at);
create policy "sales read shop" on public.sales for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "sales write shop" on public.sales for all using (public.is_shop_member(auth.uid(), shop_id)) with check (public.is_shop_member(auth.uid(), shop_id));

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  qty numeric(12,3) not null,
  price numeric(12,2) not null,
  total numeric(12,2) not null,
  created_at timestamptz not null default now()
);
alter table public.sale_items enable row level security;
create policy "sale_items read" on public.sale_items for select using (
  exists (select 1 from public.sales s where s.id = sale_id and (public.is_shop_member(auth.uid(), s.shop_id) or public.is_admin(auth.uid())))
);
create policy "sale_items write" on public.sale_items for all using (
  exists (select 1 from public.sales s where s.id = sale_id and public.is_shop_member(auth.uid(), s.shop_id))
) with check (
  exists (select 1 from public.sales s where s.id = sale_id and public.is_shop_member(auth.uid(), s.shop_id))
);

-- ============= PURCHASES =============
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  invoice_no text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  due numeric(12,2) not null default 0,
  payment_method public.payment_method not null default 'cash',
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.purchases enable row level security;
create trigger tg_pur_upd before update on public.purchases for each row execute function public.tg_set_updated_at();
create policy "pur read shop" on public.purchases for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "pur write shop" on public.purchases for all using (public.is_shop_member(auth.uid(), shop_id)) with check (public.is_shop_member(auth.uid(), shop_id));

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  qty numeric(12,3) not null,
  price numeric(12,2) not null,
  total numeric(12,2) not null,
  created_at timestamptz not null default now()
);
alter table public.purchase_items enable row level security;
create policy "pur_items read" on public.purchase_items for select using (
  exists (select 1 from public.purchases p where p.id = purchase_id and (public.is_shop_member(auth.uid(), p.shop_id) or public.is_admin(auth.uid())))
);
create policy "pur_items write" on public.purchase_items for all using (
  exists (select 1 from public.purchases p where p.id = purchase_id and public.is_shop_member(auth.uid(), p.shop_id))
) with check (
  exists (select 1 from public.purchases p where p.id = purchase_id and public.is_shop_member(auth.uid(), p.shop_id))
);

-- ============= PAYMENTS / EXPENSES / CASH =============
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  direction text not null check (direction in ('in','out')),
  amount numeric(12,2) not null,
  method public.payment_method not null default 'cash',
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create trigger tg_pay_upd before update on public.payments for each row execute function public.tg_set_updated_at();
create policy "pay read shop" on public.payments for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "pay write shop" on public.payments for all using (public.is_shop_member(auth.uid(), shop_id)) with check (public.is_shop_member(auth.uid(), shop_id));

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category text,
  amount numeric(12,2) not null,
  note text,
  paid_via public.payment_method not null default 'cash',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.expenses enable row level security;
create trigger tg_exp_upd before update on public.expenses for each row execute function public.tg_set_updated_at();
create policy "exp read shop" on public.expenses for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "exp write shop" on public.expenses for all using (public.is_shop_member(auth.uid(), shop_id)) with check (public.is_shop_member(auth.uid(), shop_id));

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  amount numeric(12,2) not null,
  note text,
  ref_table text,
  ref_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.cash_movements enable row level security;
create policy "cash read shop" on public.cash_movements for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));
create policy "cash write shop" on public.cash_movements for all using (public.is_shop_member(auth.uid(), shop_id)) with check (public.is_shop_member(auth.uid(), shop_id));

-- ============= NOTIFICATIONS =============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  type text default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notif read own" on public.notifications for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "notif update own" on public.notifications for update using (user_id = auth.uid());
create policy "notif insert admin" on public.notifications for insert with check (public.is_admin(auth.uid()) or user_id = auth.uid());

create table public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  whatsapp boolean not null default false,
  telegram boolean not null default false,
  whatsapp_number text,
  telegram_chat_id text,
  updated_at timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
create trigger tg_ns_upd before update on public.notification_settings for each row execute function public.tg_set_updated_at();
create policy "ns own" on public.notification_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============= STORAGE BUCKETS =============
insert into storage.buckets (id, name, public) values ('shop-logos','shop-logos',true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('product-images','product-images',true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('payment-proofs','payment-proofs',false) on conflict do nothing;

create policy "public read shop-logos" on storage.objects for select using (bucket_id = 'shop-logos');
create policy "auth upload shop-logos" on storage.objects for insert to authenticated with check (bucket_id = 'shop-logos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner update shop-logos" on storage.objects for update to authenticated using (bucket_id = 'shop-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "public read product-images" on storage.objects for select using (bucket_id = 'product-images');
create policy "auth upload product-images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "owner update product-images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "owner read payment-proofs" on storage.objects for select to authenticated using (bucket_id = 'payment-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid())));
create policy "auth upload payment-proofs" on storage.objects for insert to authenticated with check (bucket_id = 'payment-proofs' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============= SEED PLANS =============
insert into public.subscription_plans (code, name_bn, name_en, price_bdt, duration_days) values
  ('monthly', 'মাসিক', 'Monthly', 299, 30),
  ('half_yearly', 'ষান্মাসিক', 'Half-Yearly', 1499, 180),
  ('yearly', 'বার্ষিক', 'Yearly', 2499, 365)
on conflict (code) do nothing;
