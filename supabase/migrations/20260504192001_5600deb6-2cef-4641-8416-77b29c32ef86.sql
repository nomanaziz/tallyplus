
-- 1) Helper: notify every admin
CREATE OR REPLACE FUNCTION public.notify_admins(_title text, _body text, _link text, _type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, link, type)
  SELECT ur.user_id, _title, _body, _link, _type
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

-- 2) Allow admins to read all notifications targeted at them (already user-scoped via RLS) — no change needed.

-- 3) Triggers

-- Shop transfer requests
CREATE OR REPLACE FUNCTION public.tg_notify_shop_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_shop_name text;
BEGIN
  SELECT name INTO v_shop_name FROM public.shops WHERE id = NEW.shop_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins(
      'নতুন Ownership Transfer Request',
      COALESCE(v_shop_name, 'Shop') || ' — status: ' || NEW.status,
      '/admin/transfers',
      'shop_transfer'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    PERFORM public.notify_admins(
      'Transfer status updated',
      COALESCE(v_shop_name, 'Shop') || ' → ' || NEW.status,
      '/admin/transfers',
      'shop_transfer'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_notify_shop_transfer_ins ON public.shop_transfer_requests;
CREATE TRIGGER tg_notify_shop_transfer_ins
AFTER INSERT OR UPDATE ON public.shop_transfer_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_shop_transfer();

-- Subscription requests
CREATE OR REPLACE FUNCTION public.tg_notify_subscription_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins('নতুন Subscription Request', 'A user requested a subscription plan', '/admin/subscription-requests', 'subscription_request');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_notify_subscription_request_ins ON public.subscription_requests;
CREATE TRIGGER tg_notify_subscription_request_ins
AFTER INSERT ON public.subscription_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_subscription_request();

-- SMS purchase requests
CREATE OR REPLACE FUNCTION public.tg_notify_sms_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins('নতুন SMS Purchase Request', 'A shop requested SMS top-up', '/admin/sms-gateways', 'sms_purchase');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_notify_sms_purchase_ins ON public.sms_purchase_requests;
CREATE TRIGGER tg_notify_sms_purchase_ins
AFTER INSERT ON public.sms_purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_sms_purchase();

-- New subscriptions (active/trial)
CREATE OR REPLACE FUNCTION public.tg_notify_new_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('active','trial') THEN
    PERFORM public.notify_admins(
      CASE WHEN NEW.status = 'trial' THEN 'নতুন Trial Subscription' ELSE 'নতুন Paid Subscription' END,
      'User: ' || COALESCE(NEW.user_id::text,''),
      '/admin/subscriptions',
      'subscription'
    );
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_notify_new_subscription_ins ON public.subscriptions;
CREATE TRIGGER tg_notify_new_subscription_ins
AFTER INSERT ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_subscription();

-- Affiliate withdrawals
CREATE OR REPLACE FUNCTION public.tg_notify_affiliate_withdrawal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins('নতুন Withdrawal Request', '৳' || NEW.amount::text, '/admin/affiliates', 'withdrawal');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_notify_affiliate_withdrawal_ins ON public.affiliate_withdrawals;
CREATE TRIGGER tg_notify_affiliate_withdrawal_ins
AFTER INSERT ON public.affiliate_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_affiliate_withdrawal();

-- New user signup (profiles)
CREATE OR REPLACE FUNCTION public.tg_notify_new_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.notify_admins(
    'নতুন User Signup',
    COALESCE(NEW.full_name, NEW.phone, 'New user'),
    '/admin/users',
    'signup'
  );
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_notify_new_signup_ins ON public.profiles;
CREATE TRIGGER tg_notify_new_signup_ins
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_signup();

-- New shop creation
CREATE OR REPLACE FUNCTION public.tg_notify_new_shop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.notify_admins('নতুন Shop তৈরি', COALESCE(NEW.name,'Shop'), '/admin/users', 'shop_created');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_notify_new_shop_ins ON public.shops;
CREATE TRIGGER tg_notify_new_shop_ins
AFTER INSERT ON public.shops
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_shop();
