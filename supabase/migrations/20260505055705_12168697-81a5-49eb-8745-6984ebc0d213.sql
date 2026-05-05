-- 1) transfer_settings: payment account display fields
ALTER TABLE public.transfer_settings
  ADD COLUMN IF NOT EXISTS payment_number text,
  ADD COLUMN IF NOT EXISTS payment_account_type text,
  ADD COLUMN IF NOT EXISTS payment_provider_label text;

-- 2) shop_transfer_requests: payment method + refund tracking
ALTER TABLE public.shop_transfer_requests
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_txn_id text,
  ADD COLUMN IF NOT EXISTS payment_transaction_id uuid REFERENCES public.payment_transactions(id),
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refund_note text;

-- 3) payment_transactions: link back to a transfer request
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS shop_transfer_id uuid REFERENCES public.shop_transfer_requests(id);

-- 4) Updated request_shop_transfer with payment method/txn id
CREATE OR REPLACE FUNCTION public.request_shop_transfer(
  _shop_id uuid,
  _to_phone text,
  _reason text,
  _payment_proof_url text,
  _payment_method text DEFAULT 'manual',
  _payment_txn_id text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_to_user uuid;
  v_charge numeric;
  v_phone_norm text;
  v_id uuid;
  v_status text;
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

  -- Manual: needs admin verify after submission
  -- Online: stays pending_payment until gateway verifies, then auto -> pending_recipient
  IF _payment_method = 'online' THEN
    v_status := 'pending_payment';
  ELSE
    -- manual: if proof+txn provided, go to pending_admin (admin must verify), else pending_payment
    IF _payment_proof_url IS NOT NULL OR _payment_txn_id IS NOT NULL THEN
      v_status := 'pending_admin';
    ELSE
      v_status := 'pending_payment';
    END IF;
  END IF;

  INSERT INTO public.shop_transfer_requests (
    shop_id, from_user_id, to_user_id, to_phone, reason, charge_amount,
    payment_proof_url, payment_method, payment_txn_id, status
  )
  VALUES (
    _shop_id, v_uid, v_to_user, v_phone_norm, _reason, v_charge,
    _payment_proof_url, COALESCE(_payment_method,'manual'), _payment_txn_id, v_status
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'charge', v_charge, 'to_user_id', v_to_user, 'status', v_status);
END $fn$;

-- 5) Verify online payment & auto-advance transfer to pending_recipient
CREATE OR REPLACE FUNCTION public.verify_transfer_payment(_transfer_id uuid, _payment_transaction_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_req record;
BEGIN
  SELECT * INTO v_req FROM public.shop_transfer_requests WHERE id = _transfer_id;
  IF v_req IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_req.status NOT IN ('pending_payment') THEN
    RETURN jsonb_build_object('ok', true, 'already', v_req.status);
  END IF;
  UPDATE public.shop_transfer_requests
    SET status = 'pending_recipient',
        payment_transaction_id = _payment_transaction_id,
        admin_notes = COALESCE(admin_notes, '') || ' [auto-verified via gateway]'
    WHERE id = _transfer_id;
  RETURN jsonb_build_object('ok', true);
END $fn$;

-- 6) Admin refund recording (does not call gateway — admin handles refund externally)
CREATE OR REPLACE FUNCTION public.admin_refund_shop_transfer(_id uuid, _amount numeric, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
BEGIN
  IF NOT public.is_admin(v_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  SELECT * INTO v_req FROM public.shop_transfer_requests WHERE id = _id;
  IF v_req IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_req.refunded_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_refunded');
  END IF;
  UPDATE public.shop_transfer_requests
    SET refunded_at = now(),
        refund_amount = COALESCE(_amount, charge_amount),
        refund_note = _note
    WHERE id = _id;
  -- Notify sender
  IF v_req.from_user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, body, link, type)
    VALUES (v_req.from_user_id,
      'Transfer charge refunded',
      'আপনার দোকান হস্তান্তরের চার্জ ফেরত দেওয়া হয়েছে।' || COALESCE(' ' || _note, ''),
      '/app/shops', 'shop_transfer');
  END IF;
  RETURN jsonb_build_object('ok', true);
END $fn$;
