
CREATE TABLE IF NOT EXISTS public.shop_reset_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  performed_by uuid NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_reset_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner or admin can read reset logs"
ON public.shop_reset_logs FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_reset_logs.shop_id AND s.owner_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.request_shop_reset(_shop_id uuid, _confirm_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shop record;
  v_summary jsonb := '{}'::jsonb;
  v_n int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  SELECT * INTO v_shop FROM public.shops WHERE id = _shop_id AND deleted_at IS NULL;
  IF v_shop IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'shop_not_found');
  END IF;
  IF v_shop.owner_id <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden_owner_only');
  END IF;
  IF COALESCE(_confirm_text,'') <> COALESCE(v_shop.name,'') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'confirmation_mismatch');
  END IF;

  -- Delete in dependency-safe order
  DELETE FROM public.sale_returns WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('sale_returns', v_n);
  DELETE FROM public.sale_adjustments WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('sale_adjustments', v_n);
  DELETE FROM public.sales WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('sales', v_n);
  DELETE FROM public.purchases WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('purchases', v_n);
  DELETE FROM public.expenses WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('expenses', v_n);
  DELETE FROM public.other_income WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('other_income', v_n);
  DELETE FROM public.payments WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('payments', v_n);
  DELETE FROM public.payment_transactions WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('payment_transactions', v_n);
  DELETE FROM public.cash_movements WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('cash_movements', v_n);
  DELETE FROM public.owner_transactions WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('owner_transactions', v_n);
  DELETE FROM public.stock_movements WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('stock_movements', v_n);
  DELETE FROM public.product_serials WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('product_serials', v_n);
  DELETE FROM public.service_warranties WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('service_warranties', v_n);
  DELETE FROM public.service_bookings WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('service_bookings', v_n);
  DELETE FROM public.customer_wishlists WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('customer_wishlists', v_n);
  DELETE FROM public.wishlist_customers WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('wishlist_customers', v_n);
  DELETE FROM public.quotations WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('quotations', v_n);
  DELETE FROM public.marketplace_orders WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('marketplace_orders', v_n);
  DELETE FROM public.marketplace_listings WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('marketplace_listings', v_n);
  DELETE FROM public.marketplace_service_listings WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('marketplace_service_listings', v_n);
  DELETE FROM public.promo_codes WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('promo_codes', v_n);
  DELETE FROM public.shipping_packages WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('shipping_packages', v_n);
  DELETE FROM public.products WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('products', v_n);
  DELETE FROM public.services WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('services', v_n);
  DELETE FROM public.service_categories WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('service_categories', v_n);
  DELETE FROM public.categories WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('categories', v_n);
  DELETE FROM public.customers WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('customers', v_n);
  DELETE FROM public.suppliers WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('suppliers', v_n);
  DELETE FROM public.assets WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('assets', v_n);
  DELETE FROM public.shop_delivery_zones WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('shop_delivery_zones', v_n);
  DELETE FROM public.customer_reminder_log WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('customer_reminder_log', v_n);
  DELETE FROM public.sms_history WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('sms_history', v_n);
  DELETE FROM public.shop_visits WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('shop_visits', v_n);
  DELETE FROM public.fraud_check_logs WHERE shop_id = _shop_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_summary := v_summary || jsonb_build_object('fraud_check_logs', v_n);

  -- Re-seed default delivery zones (mirrors tg_shop_seed_delivery_zones)
  INSERT INTO public.shop_delivery_zones (shop_id, name, charge, sort_order, is_active) VALUES
    (_shop_id, 'ঢাকার ভিতরে', 60, 1, true),
    (_shop_id, 'ঢাকার বাহিরে', 130, 2, true);

  INSERT INTO public.shop_reset_logs (shop_id, performed_by, summary)
  VALUES (_shop_id, v_uid, v_summary);

  RETURN jsonb_build_object('ok', true, 'summary', v_summary);
END
$$;

REVOKE ALL ON FUNCTION public.request_shop_reset(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_shop_reset(uuid, text) TO authenticated;
