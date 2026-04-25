-- ============ Affiliate program ============

create table public.affiliate_settings (
  id boolean primary key default true,
  default_commission_pct numeric not null default 15,
  lifetime_commission_pct numeric not null default 20,
  referee_discount_pct numeric not null default 10,
  is_program_active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint affiliate_settings_singleton check (id = true)
);

insert into public.affiliate_settings (id) values (true) on conflict do nothing;

create table public.affiliate_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_sales integer not null default 0,
  commission_pct numeric not null default 15,
  bonus_pct numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.affiliate_tiers (name, min_sales, commission_pct, bonus_pct, sort_order)
values
  ('Bronze', 0,   15, 0, 1),
  ('Silver', 25,  18, 2, 2),
  ('Gold',   75,  22, 5, 3),
  ('Platinum', 200, 25, 10, 4);

create table public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text not null,
  phone text not null,
  email text,
  referral_code text not null unique,
  current_tier_id uuid references public.affiliate_tiers(id) on delete set null,
  total_referrals integer not null default 0,
  total_commission numeric not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index affiliates_user_id_idx on public.affiliates(user_id);

create table public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referred_user_id uuid,
  referred_shop_id uuid references public.shops(id) on delete set null,
  referral_code text not null,
  status text not null default 'pending',
  converted_at timestamptz,
  created_at timestamptz not null default now()
);

create index affiliate_referrals_affiliate_id_idx on public.affiliate_referrals(affiliate_id);

create table public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referral_id uuid references public.affiliate_referrals(id) on delete set null,
  subscription_amount numeric not null default 0,
  commission_pct numeric not null default 0,
  commission_amount numeric not null default 0,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index affiliate_commissions_affiliate_id_idx on public.affiliate_commissions(affiliate_id);

-- updated_at triggers
create trigger affiliate_settings_set_updated before update on public.affiliate_settings
  for each row execute function public.tg_set_updated_at();
create trigger affiliate_tiers_set_updated before update on public.affiliate_tiers
  for each row execute function public.tg_set_updated_at();
create trigger affiliates_set_updated before update on public.affiliates
  for each row execute function public.tg_set_updated_at();

-- ============ RLS ============
alter table public.affiliate_settings enable row level security;
alter table public.affiliate_tiers enable row level security;
alter table public.affiliates enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.affiliate_commissions enable row level security;

-- settings: public read, admin write
create policy "aff_settings public read" on public.affiliate_settings
  for select using (true);
create policy "aff_settings admin write" on public.affiliate_settings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- tiers: public read, admin write
create policy "aff_tiers public read" on public.affiliate_tiers
  for select using (true);
create policy "aff_tiers admin write" on public.affiliate_tiers
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- affiliates: each user reads/writes own; admin all
create policy "affiliates read own" on public.affiliates
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "affiliates insert own" on public.affiliates
  for insert with check (user_id = auth.uid());
create policy "affiliates update own" on public.affiliates
  for update using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "affiliates admin delete" on public.affiliates
  for delete using (public.is_admin(auth.uid()));

-- referrals: affiliate sees own; admin sees all; insert by signed-in users
create policy "aff_referrals read own" on public.affiliate_referrals
  for select using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
    or referred_user_id = auth.uid()
  );
create policy "aff_referrals insert auth" on public.affiliate_referrals
  for insert with check (auth.uid() is not null);
create policy "aff_referrals admin update" on public.affiliate_referrals
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- commissions: affiliate read own, admin all
create policy "aff_commissions read own" on public.affiliate_commissions
  for select using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
  );
create policy "aff_commissions insert auth" on public.affiliate_commissions
  for insert with check (auth.uid() is not null);
create policy "aff_commissions admin write" on public.affiliate_commissions
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "aff_commissions admin delete" on public.affiliate_commissions
  for delete using (public.is_admin(auth.uid()));
