-- Add a public sharing slug per shop
alter table public.shops add column if not exists wishlist_slug text unique;

-- Backfill existing shops with a random slug
update public.shops
set wishlist_slug = lower(regexp_replace(encode(gen_random_bytes(6), 'base64'), '[^a-zA-Z0-9]', '', 'g'))
where wishlist_slug is null;

-- Customer wishlists
create table if not exists public.customer_wishlists (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_address text,
  note text,
  color text not null default 'default',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_wishlists_shop_created_idx
  on public.customer_wishlists(shop_id, created_at desc);

alter table public.customer_wishlists enable row level security;

create trigger tg_customer_wishlists_upd
before update on public.customer_wishlists
for each row execute function public.tg_set_updated_at();

create policy "wishlists read shop" on public.customer_wishlists
  for select using (public.is_shop_member(auth.uid(), shop_id) or public.is_admin(auth.uid()));

create policy "wishlists update shop" on public.customer_wishlists
  for update using (public.is_shop_member(auth.uid(), shop_id))
  with check (public.is_shop_member(auth.uid(), shop_id));

create policy "wishlists delete shop" on public.customer_wishlists
  for delete using (public.is_shop_member(auth.uid(), shop_id));

-- (No INSERT policy — inserts happen via edge function with service role)

-- Wishlist items
create table if not exists public.customer_wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.customer_wishlists(id) on delete cascade,
  name text not null,
  qty numeric,
  unit text,
  position int not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists customer_wishlist_items_wishlist_idx
  on public.customer_wishlist_items(wishlist_id, position);

alter table public.customer_wishlist_items enable row level security;

create policy "wishlist_items read shop" on public.customer_wishlist_items
  for select using (
    exists (
      select 1 from public.customer_wishlists w
      where w.id = customer_wishlist_items.wishlist_id
        and (public.is_shop_member(auth.uid(), w.shop_id) or public.is_admin(auth.uid()))
    )
  );

create policy "wishlist_items update shop" on public.customer_wishlist_items
  for update using (
    exists (
      select 1 from public.customer_wishlists w
      where w.id = customer_wishlist_items.wishlist_id
        and public.is_shop_member(auth.uid(), w.shop_id)
    )
  ) with check (
    exists (
      select 1 from public.customer_wishlists w
      where w.id = customer_wishlist_items.wishlist_id
        and public.is_shop_member(auth.uid(), w.shop_id)
    )
  );

create policy "wishlist_items delete shop" on public.customer_wishlist_items
  for delete using (
    exists (
      select 1 from public.customer_wishlists w
      where w.id = customer_wishlist_items.wishlist_id
        and public.is_shop_member(auth.uid(), w.shop_id)
    )
  );