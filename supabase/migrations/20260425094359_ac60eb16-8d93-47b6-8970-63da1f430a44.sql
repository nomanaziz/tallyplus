-- Shops: marketplace fields
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS marketplace_enabled boolean NOT NULL DEFAULT false;

-- customer_wishlists: link to logged-in consumer
ALTER TABLE public.customer_wishlists
  ADD COLUMN IF NOT EXISTS consumer_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_customer_wishlists_consumer_user_id
  ON public.customer_wishlists(consumer_user_id);

-- consumer_profiles
CREATE TABLE IF NOT EXISTS public.consumer_profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  address text,
  default_lat numeric,
  default_lng numeric,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_consumer_profiles_phone
  ON public.consumer_profiles(phone);

ALTER TABLE public.consumer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consumer self read"
  ON public.consumer_profiles FOR SELECT
  USING (auth.uid() = id OR is_admin(auth.uid()));

CREATE POLICY "consumer self insert"
  ON public.consumer_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "consumer self update"
  ON public.consumer_profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR is_admin(auth.uid()));

CREATE TRIGGER trg_consumer_profiles_updated_at
  BEFORE UPDATE ON public.consumer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- consumer_favourite_shops
CREATE TABLE IF NOT EXISTS public.consumer_favourite_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consumer_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_fav_shops_consumer ON public.consumer_favourite_shops(consumer_id);
CREATE INDEX IF NOT EXISTS idx_fav_shops_shop ON public.consumer_favourite_shops(shop_id);

ALTER TABLE public.consumer_favourite_shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fav read own"
  ON public.consumer_favourite_shops FOR SELECT
  USING (auth.uid() = consumer_id OR is_admin(auth.uid()));

CREATE POLICY "fav insert own"
  ON public.consumer_favourite_shops FOR INSERT
  WITH CHECK (auth.uid() = consumer_id);

CREATE POLICY "fav delete own"
  ON public.consumer_favourite_shops FOR DELETE
  USING (auth.uid() = consumer_id);

-- consumer_saved_carts
CREATE TABLE IF NOT EXISTS public.consumer_saved_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_user_id uuid NOT NULL,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_carts_consumer ON public.consumer_saved_carts(consumer_user_id);

ALTER TABLE public.consumer_saved_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved cart read own"
  ON public.consumer_saved_carts FOR SELECT
  USING (auth.uid() = consumer_user_id OR is_admin(auth.uid()));

CREATE POLICY "saved cart insert own"
  ON public.consumer_saved_carts FOR INSERT
  WITH CHECK (auth.uid() = consumer_user_id);

CREATE POLICY "saved cart update own"
  ON public.consumer_saved_carts FOR UPDATE
  USING (auth.uid() = consumer_user_id)
  WITH CHECK (auth.uid() = consumer_user_id);

CREATE POLICY "saved cart delete own"
  ON public.consumer_saved_carts FOR DELETE
  USING (auth.uid() = consumer_user_id);

CREATE TRIGGER trg_saved_carts_updated_at
  BEFORE UPDATE ON public.consumer_saved_carts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- is_consumer helper
CREATE OR REPLACE FUNCTION public.is_consumer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'consumer')
$$;

-- Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_account_type text := coalesce(new.raw_user_meta_data->>'account_type', 'owner');
  v_full_name text := coalesce(new.raw_user_meta_data->>'full_name', '');
begin
  if v_account_type = 'consumer' then
    insert into public.consumer_profiles (id, name, phone)
      values (new.id, v_full_name, coalesce(new.phone, ''))
      on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'consumer') on conflict do nothing;
  else
    insert into public.profiles (id, phone, full_name)
      values (new.id, new.phone, v_full_name)
      on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'owner') on conflict do nothing;
  end if;
  return new;
end;
$function$;