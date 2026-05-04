
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE public.consumer_profiles ADD COLUMN IF NOT EXISTS country_code text;
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON public.profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_consumer_profiles_country_code ON public.consumer_profiles(country_code);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_account_type text := coalesce(new.raw_user_meta_data->>'account_type', 'owner');
  v_full_name text := coalesce(new.raw_user_meta_data->>'full_name', '');
  v_country text := nullif(coalesce(new.raw_user_meta_data->>'country_code', ''), '');
begin
  if v_account_type = 'consumer' then
    insert into public.consumer_profiles (id, name, phone, country_code)
      values (new.id, v_full_name, coalesce(new.phone, ''), v_country)
      on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'consumer') on conflict do nothing;
  else
    insert into public.profiles (id, phone, full_name, country_code)
      values (new.id, new.phone, v_full_name, v_country)
      on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'owner') on conflict do nothing;
    PERFORM public.grant_trial_subscription(new.id);
  end if;
  return new;
end;
$function$;
