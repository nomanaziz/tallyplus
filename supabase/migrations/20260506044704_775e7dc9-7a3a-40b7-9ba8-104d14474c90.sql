
-- ================== Settings ==================
CREATE TABLE IF NOT EXISTS public.shop_restore_settings (
  id boolean PRIMARY KEY DEFAULT true,
  reset_price_bdt int NOT NULL DEFAULT 500,
  delete_price_bdt int NOT NULL DEFAULT 1000,
  retention_days int NOT NULL DEFAULT 30,
  max_resets_per_user int NOT NULL DEFAULT 3,
  delete_grace_days int NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = true)
);
INSERT INTO public.shop_restore_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE public.shop_restore_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads restore settings" ON public.shop_restore_settings;
CREATE POLICY "anyone reads restore settings" ON public.shop_restore_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin manages restore settings" ON public.shop_restore_settings;
CREATE POLICY "admin manages restore settings" ON public.shop_restore_settings FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ================== Snapshots ==================
CREATE TABLE IF NOT EXISTS public.shop_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  shop_owner_id uuid NOT NULL,
  shop_name text NOT NULL,
  shop_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  kind text NOT NULL CHECK (kind IN ('reset','delete')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  size_bytes int NOT NULL DEFAULT 0,
  performed_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','restored','expired','purged')),
  restored_at timestamptz,
  restored_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
CREATE INDEX IF NOT EXISTS idx_shop_snapshots_owner ON public.shop_snapshots(shop_owner_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_snapshots_expires ON public.shop_snapshots(expires_at) WHERE status = 'available';
ALTER TABLE public.shop_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner or admin reads snapshots" ON public.shop_snapshots;
CREATE POLICY "owner or admin reads snapshots" ON public.shop_snapshots FOR SELECT
  USING (public.is_admin(auth.uid()) OR shop_owner_id = auth.uid());

-- ================== Restore requests ==================
CREATE TABLE IF NOT EXISTS public.shop_restore_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.shop_snapshots(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('reset','delete')),
  merge_mode text NOT NULL DEFAULT 'replace' CHECK (merge_mode IN ('replace','merge')),
  amount_bdt int NOT NULL,
  status text NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment','paid','restored','rejected','expired')),
  payment_ref text,
  paid_at timestamptz,
  admin_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_restore_requests_owner ON public.shop_restore_requests(requested_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_restore_requests_status ON public.shop_restore_requests(status, created_at DESC);
ALTER TABLE public.shop_restore_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner or admin reads restore reqs" ON public.shop_restore_requests;
CREATE POLICY "owner or admin reads restore reqs" ON public.shop_restore_requests FOR SELECT
  USING (public.is_admin(auth.uid()) OR requested_by = auth.uid());

CREATE TRIGGER trg_restore_req_updated BEFORE UPDATE ON public.shop_restore_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ================== Shops grace columns ==================
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS grace_expires_at timestamptz;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- ================== Helper: build snapshot payload ==================
CREATE OR REPLACE FUNCTION public._build_shop_snapshot(_shop_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v jsonb := '{}'::jsonb;
BEGIN
  v := v || jsonb_build_object('shop',
    (SELECT to_jsonb(s) FROM public.shops s WHERE s.id = _shop_id));
  v := v || jsonb_build_object('products',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.products t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('categories',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.categories t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('customers',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.customers t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('suppliers',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.suppliers t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('sales',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.sales t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('sale_items',
    COALESCE((SELECT jsonb_agg(to_jsonb(si)) FROM public.sale_items si JOIN public.sales s ON s.id = si.sale_id WHERE s.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('purchases',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.purchases t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('purchase_items',
    COALESCE((SELECT jsonb_agg(to_jsonb(pi)) FROM public.purchase_items pi JOIN public.purchases p ON p.id = pi.purchase_id WHERE p.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('expenses',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.expenses t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('other_income',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.other_income t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('payments',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.payments t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('cash_movements',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.cash_movements t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('owner_transactions',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.owner_transactions t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('stock_movements',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.stock_movements t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('services',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.services t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('assets',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.assets t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('quotations',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.quotations t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('customer_wishlists',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.customer_wishlists t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  v := v || jsonb_build_object('marketplace_listings',
    COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.marketplace_listings t WHERE t.shop_id = _shop_id),'[]'::jsonb));
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public._build_shop_snapshot(uuid) FROM PUBLIC;

-- ================== Helper: build summary ==================
CREATE OR REPLACE FUNCTION public._build_shop_summary(_shop_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb := '{}'::jsonb; n int;
BEGIN
  SELECT count(*) INTO n FROM public.products WHERE shop_id = _shop_id; r := r || jsonb_build_object('products', n);
  SELECT count(*) INTO n FROM public.sales WHERE shop_id = _shop_id; r := r || jsonb_build_object('sales', n);
  SELECT count(*) INTO n FROM public.purchases WHERE shop_id = _shop_id; r := r || jsonb_build_object('purchases', n);
  SELECT count(*) INTO n FROM public.customers WHERE shop_id = _shop_id; r := r || jsonb_build_object('customers', n);
  SELECT count(*) INTO n FROM public.suppliers WHERE shop_id = _shop_id; r := r || jsonb_build_object('suppliers', n);
  SELECT count(*) INTO n FROM public.expenses WHERE shop_id = _shop_id; r := r || jsonb_build_object('expenses', n);
  SELECT count(*) INTO n FROM public.payments WHERE shop_id = _shop_id; r := r || jsonb_build_object('payments', n);
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public._build_shop_summary(uuid) FROM PUBLIC;

-- ================== request_shop_reset (rewritten) ==================
CREATE OR REPLACE FUNCTION public.request_shop_reset(_shop_id uuid, _confirm_text text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shop record;
  v_summary jsonb;
  v_payload jsonb;
  v_snap_id uuid;
  v_max int;
  v_n int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO v_shop FROM public.shops WHERE id = _shop_id AND deleted_at IS NULL;
  IF v_shop IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'shop_not_found'); END IF;
  IF v_shop.owner_id <> v_uid THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden_owner_only'); END IF;
  IF COALESCE(_confirm_text,'') <> COALESCE(v_shop.name,'') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'confirmation_mismatch');
  END IF;

  v_payload := public._build_shop_snapshot(_shop_id);
  v_summary := public._build_shop_summary(_shop_id);

  INSERT INTO public.shop_snapshots(shop_id, shop_owner_id, shop_name, shop_meta, kind, payload, summary, size_bytes, performed_by, expires_at)
  VALUES (_shop_id, v_shop.owner_id, v_shop.name,
          jsonb_build_object('phone', v_shop.phone, 'address', v_shop.address, 'logo_url', v_shop.logo_url, 'currency', v_shop.currency),
          'reset', v_payload, v_summary, octet_length(v_payload::text), v_uid,
          now() + ((SELECT retention_days FROM public.shop_restore_settings) || ' days')::interval)
  RETURNING id INTO v_snap_id;

  -- prune older reset snapshots
  SELECT max_resets_per_user INTO v_max FROM public.shop_restore_settings;
  DELETE FROM public.shop_snapshots
  WHERE id IN (
    SELECT id FROM public.shop_snapshots
    WHERE shop_owner_id = v_shop.owner_id AND kind = 'reset'
    ORDER BY created_at DESC OFFSET v_max
  );

  -- existing cascade
  DELETE FROM public.sale_returns WHERE shop_id = _shop_id;
  DELETE FROM public.sale_adjustments WHERE shop_id = _shop_id;
  DELETE FROM public.sales WHERE shop_id = _shop_id;
  DELETE FROM public.purchases WHERE shop_id = _shop_id;
  DELETE FROM public.expenses WHERE shop_id = _shop_id;
  DELETE FROM public.other_income WHERE shop_id = _shop_id;
  DELETE FROM public.payments WHERE shop_id = _shop_id;
  DELETE FROM public.payment_transactions WHERE shop_id = _shop_id;
  DELETE FROM public.cash_movements WHERE shop_id = _shop_id;
  DELETE FROM public.owner_transactions WHERE shop_id = _shop_id;
  DELETE FROM public.stock_movements WHERE shop_id = _shop_id;
  DELETE FROM public.product_serials WHERE shop_id = _shop_id;
  DELETE FROM public.service_warranties WHERE shop_id = _shop_id;
  DELETE FROM public.service_bookings WHERE shop_id = _shop_id;
  DELETE FROM public.customer_wishlists WHERE shop_id = _shop_id;
  DELETE FROM public.wishlist_customers WHERE shop_id = _shop_id;
  DELETE FROM public.quotations WHERE shop_id = _shop_id;
  DELETE FROM public.marketplace_orders WHERE shop_id = _shop_id;
  DELETE FROM public.marketplace_listings WHERE shop_id = _shop_id;
  DELETE FROM public.marketplace_service_listings WHERE shop_id = _shop_id;
  DELETE FROM public.promo_codes WHERE shop_id = _shop_id;
  DELETE FROM public.shipping_packages WHERE shop_id = _shop_id;
  DELETE FROM public.products WHERE shop_id = _shop_id;
  DELETE FROM public.services WHERE shop_id = _shop_id;
  DELETE FROM public.service_categories WHERE shop_id = _shop_id;
  DELETE FROM public.categories WHERE shop_id = _shop_id;
  DELETE FROM public.customers WHERE shop_id = _shop_id;
  DELETE FROM public.suppliers WHERE shop_id = _shop_id;
  DELETE FROM public.assets WHERE shop_id = _shop_id;
  DELETE FROM public.shop_delivery_zones WHERE shop_id = _shop_id;
  DELETE FROM public.customer_reminder_log WHERE shop_id = _shop_id;
  DELETE FROM public.sms_history WHERE shop_id = _shop_id;
  DELETE FROM public.shop_visits WHERE shop_id = _shop_id;
  DELETE FROM public.fraud_check_logs WHERE shop_id = _shop_id;

  INSERT INTO public.shop_delivery_zones (shop_id, name, charge, sort_order, is_active) VALUES
    (_shop_id, 'ঢাকার ভিতরে', 60, 1, true),
    (_shop_id, 'ঢাকার বাহিরে', 130, 2, true);

  INSERT INTO public.shop_reset_logs (shop_id, performed_by, summary)
  VALUES (_shop_id, v_uid, v_summary);

  PERFORM public.notify_admins(
    'নতুন Shop Reset — Snapshot সংরক্ষিত',
    COALESCE(v_shop.name,'Shop') || ' • Owner: ' || v_uid::text,
    '/admin/shop-recycle-bin',
    'shop_reset'
  );

  RETURN jsonb_build_object('ok', true, 'summary', v_summary, 'snapshot_id', v_snap_id);
END $$;
REVOKE ALL ON FUNCTION public.request_shop_reset(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_shop_reset(uuid, text) TO authenticated;

-- ================== request_shop_delete ==================
CREATE OR REPLACE FUNCTION public.request_shop_delete(_shop_id uuid, _confirm_text text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shop record;
  v_summary jsonb;
  v_payload jsonb;
  v_snap_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO v_shop FROM public.shops WHERE id = _shop_id AND deleted_at IS NULL;
  IF v_shop IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'shop_not_found'); END IF;
  IF v_shop.owner_id <> v_uid THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden_owner_only'); END IF;
  IF COALESCE(lower(_confirm_text),'') <> COALESCE(lower(v_shop.name),'') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'confirmation_mismatch');
  END IF;

  v_payload := public._build_shop_snapshot(_shop_id);
  v_summary := public._build_shop_summary(_shop_id);

  INSERT INTO public.shop_snapshots(shop_id, shop_owner_id, shop_name, shop_meta, kind, payload, summary, size_bytes, performed_by, expires_at)
  VALUES (_shop_id, v_shop.owner_id, v_shop.name,
          jsonb_build_object('phone', v_shop.phone, 'address', v_shop.address, 'logo_url', v_shop.logo_url, 'currency', v_shop.currency),
          'delete', v_payload, v_summary, octet_length(v_payload::text), v_uid,
          now() + ((SELECT retention_days FROM public.shop_restore_settings) || ' days')::interval)
  RETURNING id INTO v_snap_id;

  -- soft-delete shop
  UPDATE public.shops SET deleted_at = now(), is_hidden = true WHERE id = _shop_id;

  PERFORM public.notify_admins(
    'নতুন Shop Delete — Snapshot সংরক্ষিত',
    COALESCE(v_shop.name,'Shop') || ' • Owner: ' || v_uid::text,
    '/admin/shop-recycle-bin',
    'shop_delete'
  );

  RETURN jsonb_build_object('ok', true, 'snapshot_id', v_snap_id, 'summary', v_summary);
END $$;
REVOKE ALL ON FUNCTION public.request_shop_delete(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_shop_delete(uuid, text) TO authenticated;

-- ================== submit_restore_request ==================
CREATE OR REPLACE FUNCTION public.submit_restore_request(_snapshot_id uuid, _merge_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_snap record;
  v_settings record;
  v_amount int;
  v_existing uuid;
  v_req_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO v_snap FROM public.shop_snapshots WHERE id = _snapshot_id;
  IF v_snap IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'snapshot_not_found'); END IF;
  IF v_snap.shop_owner_id <> v_uid THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF v_snap.status <> 'available' THEN RETURN jsonb_build_object('ok', false, 'error', 'snapshot_unavailable'); END IF;
  IF v_snap.expires_at <= now() THEN RETURN jsonb_build_object('ok', false, 'error', 'snapshot_expired'); END IF;

  SELECT * INTO v_settings FROM public.shop_restore_settings;
  v_amount := CASE WHEN v_snap.kind = 'reset' THEN v_settings.reset_price_bdt ELSE v_settings.delete_price_bdt END;

  SELECT id INTO v_existing FROM public.shop_restore_requests
   WHERE snapshot_id = _snapshot_id AND status IN ('awaiting_payment','paid');
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'request_id', v_existing, 'already_pending', true, 'amount', v_amount);
  END IF;

  INSERT INTO public.shop_restore_requests(snapshot_id, shop_id, requested_by, kind, merge_mode, amount_bdt, status)
  VALUES (_snapshot_id, v_snap.shop_id, v_uid, v_snap.kind,
          CASE WHEN _merge_mode = 'merge' THEN 'merge' ELSE 'replace' END,
          v_amount, 'awaiting_payment')
  RETURNING id INTO v_req_id;

  PERFORM public.notify_admins(
    'নতুন Restore Request — ' || v_snap.kind,
    'Shop: ' || v_snap.shop_name || ' • ৳' || v_amount::text,
    '/admin/shop-recycle-bin',
    'restore_request'
  );

  RETURN jsonb_build_object('ok', true, 'request_id', v_req_id, 'amount', v_amount);
END $$;
REVOKE ALL ON FUNCTION public.submit_restore_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_restore_request(uuid, text) TO authenticated;

-- ================== Internal restore from snapshot ==================
CREATE OR REPLACE FUNCTION public._apply_snapshot_restore(_snap_id uuid, _merge_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_snap record;
  v_shop_id uuid;
  v_payload jsonb;
  v_tables text[] := ARRAY[
    'categories','customers','suppliers','products','services','assets','quotations',
    'sales','sale_items','purchases','purchase_items','expenses','other_income',
    'payments','cash_movements','owner_transactions','stock_movements',
    'customer_wishlists','marketplace_listings'
  ];
  t text;
  v_rows jsonb;
BEGIN
  SELECT * INTO v_snap FROM public.shop_snapshots WHERE id = _snap_id;
  IF v_snap IS NULL THEN RAISE EXCEPTION 'snapshot_not_found'; END IF;
  v_shop_id := v_snap.shop_id;
  v_payload := v_snap.payload;

  -- For delete-kind: undelete shop + restore shop row's columns
  IF v_snap.kind = 'delete' THEN
    UPDATE public.shops SET deleted_at = NULL, is_hidden = false WHERE id = v_shop_id;
  END IF;

  -- For replace mode: wipe current shop data first (same cascade list)
  IF _merge_mode = 'replace' THEN
    DELETE FROM public.sale_items si USING public.sales s WHERE si.sale_id = s.id AND s.shop_id = v_shop_id;
    DELETE FROM public.purchase_items pi USING public.purchases p WHERE pi.purchase_id = p.id AND p.shop_id = v_shop_id;
    DELETE FROM public.sales WHERE shop_id = v_shop_id;
    DELETE FROM public.purchases WHERE shop_id = v_shop_id;
    DELETE FROM public.expenses WHERE shop_id = v_shop_id;
    DELETE FROM public.other_income WHERE shop_id = v_shop_id;
    DELETE FROM public.payments WHERE shop_id = v_shop_id;
    DELETE FROM public.cash_movements WHERE shop_id = v_shop_id;
    DELETE FROM public.owner_transactions WHERE shop_id = v_shop_id;
    DELETE FROM public.stock_movements WHERE shop_id = v_shop_id;
    DELETE FROM public.quotations WHERE shop_id = v_shop_id;
    DELETE FROM public.customer_wishlists WHERE shop_id = v_shop_id;
    DELETE FROM public.marketplace_listings WHERE shop_id = v_shop_id;
    DELETE FROM public.products WHERE shop_id = v_shop_id;
    DELETE FROM public.services WHERE shop_id = v_shop_id;
    DELETE FROM public.assets WHERE shop_id = v_shop_id;
    DELETE FROM public.categories WHERE shop_id = v_shop_id;
    DELETE FROM public.customers WHERE shop_id = v_shop_id;
    DELETE FROM public.suppliers WHERE shop_id = v_shop_id;
  END IF;

  -- Insert payload rows table by table using jsonb_populate_recordset
  -- ON CONFLICT DO NOTHING to safely handle merge collisions
  FOREACH t IN ARRAY v_tables LOOP
    v_rows := COALESCE(v_payload->t, '[]'::jsonb);
    IF jsonb_array_length(v_rows) = 0 THEN CONTINUE; END IF;
    EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1) ON CONFLICT DO NOTHING', t, t)
      USING v_rows;
  END LOOP;

  UPDATE public.shop_snapshots
     SET status = 'restored', restored_at = now(), restored_by = auth.uid()
   WHERE id = _snap_id;
END $$;
REVOKE ALL ON FUNCTION public._apply_snapshot_restore(uuid, text) FROM PUBLIC;

-- ================== admin_decide_restore ==================
CREATE OR REPLACE FUNCTION public.admin_decide_restore(_req_id uuid, _approve boolean, _payment_ref text, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req record;
  v_snap record;
  v_owner_active int;
  v_limit int;
  v_grace_days int;
BEGIN
  IF NOT public.is_admin(v_uid) THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  SELECT * INTO v_req FROM public.shop_restore_requests WHERE id = _req_id;
  IF v_req IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'request_not_found'); END IF;
  IF v_req.status NOT IN ('awaiting_payment','paid') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_state', 'status', v_req.status);
  END IF;

  IF NOT _approve THEN
    UPDATE public.shop_restore_requests
       SET status = 'rejected', admin_note = _note, decided_by = v_uid, decided_at = now()
     WHERE id = _req_id;
    INSERT INTO public.notifications(user_id, title, body, link, type)
      VALUES (v_req.requested_by, 'Restore Request Rejected', COALESCE(_note,''), '/app/restore-requests', 'restore_rejected');
    RETURN jsonb_build_object('ok', true, 'rejected', true);
  END IF;

  SELECT * INTO v_snap FROM public.shop_snapshots WHERE id = v_req.snapshot_id;

  -- For delete-kind: enforce shop slot grace if needed
  IF v_snap.kind = 'delete' THEN
    v_limit := public.user_shop_limit(v_snap.shop_owner_id);
    SELECT count(*) INTO v_owner_active FROM public.shops
      WHERE owner_id = v_snap.shop_owner_id AND deleted_at IS NULL;
    SELECT delete_grace_days INTO v_grace_days FROM public.shop_restore_settings;
    IF v_owner_active >= v_limit THEN
      UPDATE public.shops SET grace_expires_at = now() + (v_grace_days || ' days')::interval
        WHERE id = v_snap.shop_id;
    END IF;
  END IF;

  PERFORM public._apply_snapshot_restore(v_req.snapshot_id, v_req.merge_mode);

  UPDATE public.shop_restore_requests
     SET status = 'restored', payment_ref = _payment_ref, paid_at = COALESCE(paid_at, now()),
         admin_note = _note, decided_by = v_uid, decided_at = now()
   WHERE id = _req_id;

  INSERT INTO public.notifications(user_id, title, body, link, type)
    VALUES (v_req.requested_by, 'Shop Restored ✓',
            'Snapshot ' || v_snap.kind || ' পুনরুদ্ধার সম্পন্ন।',
            '/app/dashboard', 'restore_done');

  RETURN jsonb_build_object('ok', true, 'restored', true);
END $$;
REVOKE ALL ON FUNCTION public.admin_decide_restore(uuid, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_decide_restore(uuid, boolean, text, text) TO authenticated;

-- ================== Cron helpers ==================
CREATE OR REPLACE FUNCTION public.purge_expired_snapshots()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n int;
BEGIN
  -- For delete-kind expired: hard-delete the (soft-deleted) shop & all leftovers
  WITH expired AS (
    SELECT shop_id FROM public.shop_snapshots
    WHERE kind = 'delete' AND status = 'available' AND expires_at <= now()
  )
  DELETE FROM public.shops WHERE id IN (SELECT shop_id FROM expired) AND deleted_at IS NOT NULL;

  UPDATE public.shop_snapshots
     SET status = 'expired'
   WHERE status = 'available' AND expires_at <= now();
  GET DIAGNOSTICS v_n = ROW_COUNT;

  -- Fully purge expired snapshots after another retention cycle (free space)
  DELETE FROM public.shop_snapshots
   WHERE status IN ('expired','restored') AND expires_at <= now() - interval '7 days';

  RETURN v_n;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_shop_grace()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n int;
BEGIN
  UPDATE public.shops
     SET is_hidden = true
   WHERE grace_expires_at IS NOT NULL AND grace_expires_at <= now() AND is_hidden = false;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;
