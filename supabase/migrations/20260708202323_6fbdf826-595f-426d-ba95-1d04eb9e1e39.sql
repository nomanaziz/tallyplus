CREATE OR REPLACE FUNCTION public.trg_notify_admin_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.dispatch_admin_telegram('signup','👤 নতুন গ্রাহক সাইনআপ',
    format('নাম: %s%sফোন: %s', COALESCE(NEW.name,'—'), E'\n', COALESCE(NEW.phone,'—')),
    '/admin/users');
  RETURN NEW;
END;
$function$;