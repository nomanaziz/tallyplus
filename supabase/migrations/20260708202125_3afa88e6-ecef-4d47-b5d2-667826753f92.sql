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
  v_phone text := nullif(coalesce(new.raw_user_meta_data->>'phone', new.phone, ''), '');
  v_customer_digits text;
begin
  if v_account_type = 'consumer' then
    if v_phone is null and new.email like 'customer.%@tallyplus.app' then
      v_customer_digits := regexp_replace(split_part(split_part(new.email, '@', 1), 'customer.', 2), '\D', '', 'g');
      if length(v_customer_digits) > 0 then
        v_phone := '+' || v_customer_digits;
      end if;
    end if;

    insert into public.consumer_profiles (id, name, phone, country_code)
      values (new.id, coalesce(nullif(v_full_name, ''), 'Customer'), coalesce(v_phone, new.id::text), v_country)
      on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'consumer') on conflict do nothing;
  else
    insert into public.profiles (id, phone, full_name, country_code)
      values (new.id, v_phone, v_full_name, v_country)
      on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values (new.id, 'owner') on conflict do nothing;
    PERFORM public.grant_trial_subscription(new.id);
  end if;
  return new;
end;
$function$;