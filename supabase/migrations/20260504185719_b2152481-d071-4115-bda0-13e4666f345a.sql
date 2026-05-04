create policy "admin insert product-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

create policy "admin update product-images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()))
  with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

create policy "admin delete product-images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()));