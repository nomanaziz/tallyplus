
-- Fix mutable search_path
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql
security definer set search_path = public
as $$
begin new.updated_at = now(); return new; end; $$;

-- Tighten public bucket listing: anyone can read a file by URL, but only the owner can list their folder
drop policy if exists "public read shop-logos" on storage.objects;
drop policy if exists "public read product-images" on storage.objects;

create policy "owner list shop-logos" on storage.objects for select
  using (bucket_id = 'shop-logos' and (
    auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid())
  ));

create policy "owner list product-images" on storage.objects for select
  using (bucket_id = 'product-images' and (
    auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid())
  ));
