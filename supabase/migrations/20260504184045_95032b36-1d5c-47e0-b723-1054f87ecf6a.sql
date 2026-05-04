CREATE TABLE IF NOT EXISTS public.transfer_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  charge_amount numeric NOT NULL DEFAULT 200,
  is_enabled boolean NOT NULL DEFAULT true,
  payment_instructions text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.transfer_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE public.transfer_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfer_settings_read_all" ON public.transfer_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "transfer_settings_admin_update" ON public.transfer_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.shop_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid,
  to_phone text NOT NULL,
  reason text,
  charge_amount numeric NOT NULL DEFAULT 0,
  payment_proof_url text,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','pending_recipient','pending_admin','approved','rejected_recipient','rejected_admin','cancelled')),
  recipient_decided_at timestamptz,
  admin_decided_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_str_shop ON public.shop_transfer_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_str_from ON public.shop_transfer_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_str_to ON public.shop_transfer_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_str_status ON public.shop_transfer_requests(status);

ALTER TABLE public.shop_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "str_read_own" ON public.shop_transfer_requests FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "str_admin_update" ON public.shop_transfer_requests FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER str_set_updated_at BEFORE UPDATE ON public.shop_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

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
    CASE WHEN _payment_proof_url IS NOT NULL THEN 'pending_admin' ELSE 'pending_payment' END)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'charge', v_charge, 'to_user_id', v_to_user);
END $fn$;

CREATE OR REPLACE FUNCTION public.respond_shop_transfer(_id uuid, _accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO v_req FROM public.shop_transfer_requests WHERE id = _id;
  IF v_req IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_req.to_user_id <> v_uid THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF v_req.status NOT IN ('pending_recipient') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_state', 'status', v_req.status);
  END IF;
  UPDATE public.shop_transfer_requests
    SET status = CASE WHEN _accept THEN 'pending_admin' ELSE 'rejected_recipient' END,
        recipient_decided_at = now()
    WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END $fn$;

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