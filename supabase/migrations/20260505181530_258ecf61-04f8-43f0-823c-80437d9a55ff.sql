-- Payment completed
CREATE OR REPLACE FUNCTION public.trg_notify_admin_payment_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone text; v_plan text;
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT phone INTO v_phone FROM public.profiles WHERE id = NEW.user_id;
    IF v_phone IS NULL THEN
      SELECT phone INTO v_phone FROM public.consumer_profiles WHERE id = NEW.user_id;
    END IF;
    SELECT name_en INTO v_plan FROM public.subscription_plans WHERE id = NEW.plan_id;
    PERFORM public.dispatch_admin_telegram(
      'payment_paid',
      '💰 পেমেন্ট সফল ৳' || COALESCE(NEW.amount::text,'0'),
      format('Plan: %s%sUser: %s%sProvider: %s%sTxnID: %s',
        COALESCE(v_plan,'—'), E'\n',
        COALESCE(v_phone,'—'), E'\n',
        COALESCE(NEW.provider,'—'), E'\n',
        COALESCE(NEW.transaction_id,'—')),
      '/admin/payment-attempts'
    );
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_admin_payment_completed ON public.payment_transactions;
CREATE TRIGGER trg_notify_admin_payment_completed
AFTER INSERT OR UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_payment_completed();

-- Payment failed
CREATE OR REPLACE FUNCTION public.trg_notify_admin_payment_failed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone text;
BEGIN
  IF NEW.status = 'failed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'failed') THEN
    SELECT phone INTO v_phone FROM public.profiles WHERE id = NEW.user_id;
    IF v_phone IS NULL THEN
      SELECT phone INTO v_phone FROM public.consumer_profiles WHERE id = NEW.user_id;
    END IF;
    PERFORM public.dispatch_admin_telegram(
      'payment_failed',
      '❌ পেমেন্ট ব্যর্থ ৳' || COALESCE(NEW.amount::text,'0'),
      format('User: %s%sProvider: %s%sReason: %s',
        COALESCE(v_phone,'—'), E'\n',
        COALESCE(NEW.provider,'—'), E'\n',
        COALESCE(NEW.failure_reason,'—')),
      '/admin/payment-attempts'
    );
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_admin_payment_failed ON public.payment_transactions;
CREATE TRIGGER trg_notify_admin_payment_failed
AFTER INSERT OR UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_payment_failed();

-- Manual subscription request via Telegram (separate from existing in-app notify)
CREATE OR REPLACE FUNCTION public.trg_notify_admin_sub_request_tg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone text; v_plan text; v_amount numeric;
BEGIN
  SELECT phone INTO v_phone FROM public.profiles WHERE id = NEW.user_id;
  IF v_phone IS NULL THEN
    SELECT phone INTO v_phone FROM public.consumer_profiles WHERE id = NEW.user_id;
  END IF;
  SELECT name_en, price_bdt INTO v_plan, v_amount FROM public.subscription_plans WHERE id = NEW.plan_id;
  PERFORM public.dispatch_admin_telegram(
    'sub_request',
    '📥 Manual Subscription Request ৳' || COALESCE(v_amount::text,'?'),
    format('Plan: %s%sUser: %s%sMethod: %s%sTxnID: %s',
      COALESCE(v_plan,'—'), E'\n',
      COALESCE(v_phone,'—'), E'\n',
      COALESCE(NEW.payment_method::text,'—'), E'\n',
      COALESCE(NEW.txn_id,'—')),
    '/admin/subscription-requests'
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_admin_sub_request_tg ON public.subscription_requests;
CREATE TRIGGER trg_notify_admin_sub_request_tg
AFTER INSERT ON public.subscription_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_sub_request_tg();

-- Shop transfer request created
CREATE OR REPLACE FUNCTION public.trg_notify_admin_transfer_request_tg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shop text; v_from text;
BEGIN
  SELECT name INTO v_shop FROM public.shops WHERE id = NEW.shop_id;
  SELECT phone INTO v_from FROM public.profiles WHERE id = NEW.from_user_id;
  PERFORM public.dispatch_admin_telegram(
    'transfer_request',
    '🏪 Shop Transfer Request ৳' || COALESCE(NEW.charge_amount::text,'0'),
    format('Shop: %s%sFrom: %s%sTo phone: %s%sMethod: %s',
      COALESCE(v_shop,'—'), E'\n',
      COALESCE(v_from,'—'), E'\n',
      COALESCE(NEW.to_phone,'—'), E'\n',
      COALESCE(NEW.payment_method,'—')),
    '/admin/transfers'
  );
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_admin_transfer_request_tg ON public.shop_transfer_requests;
CREATE TRIGGER trg_notify_admin_transfer_request_tg
AFTER INSERT ON public.shop_transfer_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_transfer_request_tg();

-- Transfer payment proof uploaded
CREATE OR REPLACE FUNCTION public.trg_notify_admin_transfer_proof_tg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shop text;
BEGIN
  IF NEW.payment_proof_url IS NOT NULL
     AND (OLD.payment_proof_url IS NULL OR OLD.payment_proof_url <> NEW.payment_proof_url) THEN
    SELECT name INTO v_shop FROM public.shops WHERE id = NEW.shop_id;
    PERFORM public.dispatch_admin_telegram(
      'transfer_proof',
      '💳 Transfer Proof Uploaded',
      format('Shop: %s%sCharge: ৳%s%sTxnID: %s',
        COALESCE(v_shop,'—'), E'\n',
        COALESCE(NEW.charge_amount::text,'0'), E'\n',
        COALESCE(NEW.payment_txn_id,'—')),
      '/admin/transfers'
    );
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_admin_transfer_proof_tg ON public.shop_transfer_requests;
CREATE TRIGGER trg_notify_admin_transfer_proof_tg
AFTER UPDATE ON public.shop_transfer_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_transfer_proof_tg();