-- App Links table for admin-managed settings menu links
create table public.app_links (
  key text primary key,
  label_bn text not null,
  label_en text not null,
  url text not null,
  link_type text not null default 'external' check (link_type in ('internal','external')),
  icon text not null default 'Link',
  section text not null default 'other',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_links enable row level security;

create policy "app_links public read"
  on public.app_links for select
  using (is_active = true or is_admin(auth.uid()));

create policy "app_links admin write"
  on public.app_links for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create trigger trg_app_links_updated_at
  before update on public.app_links
  for each row execute function public.tg_set_updated_at();

-- Seed default rows
insert into public.app_links (key, label_bn, label_en, url, link_type, icon, section, sort_order) values
  ('growth_partner', 'হিসাবী গ্রোথ পার্টনার', 'Growth Partner', '/app/affiliate', 'internal', 'Users', 'other', 10),
  ('facebook_community', 'ফেসবুক কমিউনিটি', 'Facebook Community', 'https://facebook.com', 'external', 'Facebook', 'other', 20),
  ('help_support', 'হেল্প ও সাপোর্ট সেন্টার', 'Help & Support', 'https://wa.me/8801841577944', 'external', 'HelpCircle', 'other', 30);