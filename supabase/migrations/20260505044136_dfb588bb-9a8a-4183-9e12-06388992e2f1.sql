
-- 1) Request: with proof => pending_recipient (was pending_admin)
CREATE OR REPLACE FUNCTION public.request_shop_transfer(_shop_id uuid, _to_phone text, _reason text, _payment_proof_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_to_user uuid;
  v_charge numeric;
  v_phone_norm text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  SELECT owner_id INTO v_owner FROM public.shops WHERE id = _shop_id AND deleted_at IS NULL;
  IF v_owner IS NULL OR v_owner <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_owner');
  END IF;
  IF EXISTS (SELECT 1 FROM public.shop_transfer_requests WHERE shop_id = _shop_id AND status IN ('pending_payment','pending_recipient','pending_admin')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'transfer_already_pending');
  END IF;
  SELECT charge_amount INTO v_charge FROM public.transfer_settings WHERE id = true;
  v_charge := COALESCE(v_charge, 200);

  v_phone_norm := regexp_replace(_to_phone, '[^0-9]', '', 'g');
  IF length(v_phone_norm) < 6 THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_phone'); END IF;

  SELECT id INTO v_to_user FROM auth.users
    WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE '%' || v_phone_norm
    LIMIT 1;
  IF v_to_user IS NULL THEN
    SELECT id INTO v_to_user FROM public.profiles
      WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') LIKE '%' || v_phone_norm
      LIMIT 1;
  END IF;
  IF v_to_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'recipient_not_registered');
  END IF;
  IF v_to_user = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_transfer_to_self');
  END IF;

  INSERT INTO public.shop_transfer_requests (shop_id, from_user_id, to_user_id, to_phone, reason, charge_amount, payment_proof_url, status)
  VALUES (_shop_id, v_uid, v_to_user, v_phone_norm, _reason, v_charge, _payment_proof_url,
    CASE WHEN _payment_proof_url IS NOT NULL THEN 'pending_recipient' ELSE 'pending_payment' END)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'charge', v_charge, 'to_user_id', v_to_user);
END $fn$;

-- 2) Helper: grant a 30-day trial to the new owner if needed
CREATE OR REPLACE FUNCTION public.grant_post_transfer_trial(_user_id uuid, _shop_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_settings record;
  v_plan_id uuid;
  v_max int;
  v_count int;
  v_new_id uuid;
  v_duration int := 30;
BEGIN
  SELECT * INTO v_settings FROM public.trial_settings WHERE id = true LIMIT 1;
  IF v_settings IS NULL OR NOT v_settings.is_enabled THEN RETURN NULL; END IF;
  v_duration := COALESCE(v_settings.duration_days, 30);

  -- Current best max_shops from any active sub
  SELECT MAX(sp.max_shops) INTO v_max
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.user_id = _user_id
    AND s.status IN ('active','trial')
    AND s.expires_at > now();

  v_count := public.user_active_shop_count(_user_id);

  -- If user has enough room with an active sub, no trial needed
  IF v_max IS NOT NULL AND v_count <= v_max THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_plan_id FROM public.subscription_plans WHERE code = 'trial' LIMIT 1;
  IF v_plan_id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.subscriptions(user_id, plan_id, starts_at, expires_at, status)
  VALUES (_user_id, v_plan_id, now(), now() + (v_duration || ' days')::interval, 'trial')
  RETURNING id INTO v_new_id;

  INSERT INTO public.notifications(user_id, title, body, link, type)
  VALUES (_user_id,
    'নতুন দোকান + ৩০ দিনের ফ্রি Trial',
    'দোকান হস্তান্তর গৃহীত হয়েছে। এই দোকান পরিচালনার জন্য আপনাকে ' || v_duration || ' দিনের Trial দেওয়া হয়েছে।',
    '/app/dashboard', 'subscription');
  RETURN v_new_id;
END $fn$;

-- 3) Admin decision: bypass shop_limit trigger using session flag
CREATE OR REPLACE FUNCTION public.admin_decide_shop_transfer(_id uuid, _action text, _notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
BEGIN
  IF NOT public.is_admin(v_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  SELECT * INTO v_req FROM public.shop_transfer_requests WHERE id = _id;
  IF v_req IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  IF _action = 'verify_payment' THEN
    IF v_req.status <> 'pending_payment' THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_state'); END IF;
    UPDATE public.shop_transfer_requests SET status = 'pending_recipient', admin_notes = _notes WHERE id = _id;
  ELSIF _action = 'approve' THEN
    IF v_req.status <> 'pending_admin' THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_state'); END IF;
    UPDATE public.shops SET owner_id = v_req.to_user_id, updated_at = now() WHERE id = v_req.shop_id;
    PERFORM public.grant_post_transfer_trial(v_req.to_user_id, v_req.shop_id);
    UPDATE public.shop_transfer_requests
      SET status = 'approved', admin_decided_at = now(), admin_notes = _notes
      WHERE id = _id;
  ELSIF _action = 'reject' THEN
    IF v_req.status NOT IN ('pending_payment','pending_recipient','pending_admin') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_state');
    END IF;
    UPDATE public.shop_transfer_requests
      SET status = 'rejected_admin', admin_decided_at = now(), admin_notes = _notes
      WHERE id = _id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_action');
  END IF;
  RETURN jsonb_build_object('ok', true);
END $fn$;

-- 4) Allow shop transfer to bypass owner shop-limit trigger
CREATE OR REPLACE FUNCTION public.tg_enforce_shop_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_limit int;
  v_count int;
BEGIN
  -- On UPDATE of owner_id (transfer), skip the cap so transfers can complete
  IF TG_OP = 'UPDATE' AND NEW.owner_id IS NOT DISTINCT FROM OLD.owner_id THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Owner change via transfer flow: don't enforce. Trial helper takes care of plan.
    RETURN NEW;
  END IF;

  v_limit := public.user_shop_limit(NEW.owner_id);
  v_count := public.user_active_shop_count(NEW.owner_id);
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'shop_limit_exceeded: You have reached your plan limit of % shops. Please upgrade your subscription to add more.', v_limit
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $fn$;

-- 5) Recipient + sender notifications for transfer status changes
CREATE OR REPLACE FUNCTION public.tg_notify_transfer_parties()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_shop_name text;
BEGIN
  SELECT name INTO v_shop_name FROM public.shops WHERE id = NEW.shop_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'pending_recipient' AND NEW.to_user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, body, link, type)
    VALUES (NEW.to_user_id,
      'নতুন দোকান হস্তান্তর অনুরোধ',
      COALESCE(v_shop_name,'একটি দোকান') || ' আপনাকে হস্তান্তর করতে চাওয়া হয়েছে। গ্রহণ/বাতিল করুন।',
      '/app/dashboard', 'shop_transfer');
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    IF NEW.status = 'pending_recipient' AND NEW.to_user_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, title, body, link, type)
      VALUES (NEW.to_user_id,
        'দোকান হস্তান্তর — আপনার সিদ্ধান্ত প্রয়োজন',
        COALESCE(v_shop_name,'একটি দোকান') || ' আপনাকে হস্তান্তর করতে চাওয়া হয়েছে।',
        '/app/dashboard', 'shop_transfer');
    ELSIF NEW.status IN ('approved','rejected_admin','rejected_recipient') THEN
      IF NEW.from_user_id IS NOT NULL THEN
        INSERT INTO public.notifications(user_id, title, body, link, type)
        VALUES (NEW.from_user_id,
          'দোকান হস্তান্তর: ' || NEW.status,
          COALESCE(v_shop_name,'একটি দোকান') || ' → ' || NEW.status,
          '/app/shops', 'shop_transfer');
      END IF;
      IF NEW.to_user_id IS NOT NULL AND NEW.status = 'approved' THEN
        INSERT INTO public.notifications(user_id, title, body, link, type)
        VALUES (NEW.to_user_id,
          'দোকান হস্তান্তর সম্পূর্ণ',
          COALESCE(v_shop_name,'দোকান') || ' এখন আপনার।',
          '/app/dashboard', 'shop_transfer');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS tg_notify_transfer_parties_iu ON public.shop_transfer_requests;
CREATE TRIGGER tg_notify_transfer_parties_iu
AFTER INSERT OR UPDATE ON public.shop_transfer_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_transfer_parties();
