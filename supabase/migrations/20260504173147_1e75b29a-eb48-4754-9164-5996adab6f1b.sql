ALTER TABLE public.consumer_favourite_shops
  ADD CONSTRAINT consumer_favourite_shops_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;