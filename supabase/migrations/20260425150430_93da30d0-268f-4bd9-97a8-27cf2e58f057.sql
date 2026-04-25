alter table public.marketplace_listings
  add column if not exists warranty_months integer;