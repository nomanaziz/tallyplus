
CREATE OR REPLACE FUNCTION public.edit_purchase_invoice(
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_discount numeric,
  p_paid numeric,
  p_note text,
  p_created_at timestamptz,
  p_items jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase public.purchases%ROWTYPE;
  v_old_due numeric;
  v_old_supplier uuid;
  v_subtotal numeric := 0;
  v_total numeric;
  v_due numeric;
  v_item jsonb;
  v_qty numeric;
  v_price numeric;
  v_pid uuid;
  v_old_item record;
BEGIN
  SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'purchase_not_found'; END IF;

  v_old_due := COALESCE(v_purchase.due, 0);
  v_old_supplier := v_purchase.supplier_id;

  FOR v_old_item IN SELECT product_id, qty FROM public.purchase_items WHERE purchase_id = p_purchase_id LOOP
    IF v_old_item.product_id IS NOT NULL THEN
      UPDATE public.products SET stock = GREATEST(COALESCE(stock,0) - v_old_item.qty, 0) WHERE id = v_old_item.product_id;
    END IF;
  END LOOP;

  DELETE FROM public.purchase_items WHERE purchase_id = p_purchase_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
    v_pid := NULLIF(v_item->>'product_id','')::uuid;
    v_qty := COALESCE((v_item->>'qty')::numeric, 0);
    v_price := COALESCE((v_item->>'price')::numeric, 0);

    INSERT INTO public.purchase_items (purchase_id, product_id, name, qty, price, total)
    VALUES (p_purchase_id, v_pid, COALESCE(v_item->>'name',''), v_qty, v_price, v_qty * v_price);

    IF v_pid IS NOT NULL THEN
      UPDATE public.products SET stock = COALESCE(stock,0) + v_qty WHERE id = v_pid;
    END IF;

    v_subtotal := v_subtotal + (v_qty * v_price);
  END LOOP;

  v_total := v_subtotal - COALESCE(p_discount, 0);
  v_due := GREATEST(v_total - COALESCE(p_paid, 0), 0);

  UPDATE public.purchases
  SET supplier_id = p_supplier_id,
      subtotal = v_subtotal,
      discount = COALESCE(p_discount,0),
      total = v_total,
      paid = COALESCE(p_paid,0),
      due = v_due,
      note = p_note,
      created_at = COALESCE(p_created_at, created_at),
      updated_at = now()
  WHERE id = p_purchase_id;

  IF v_old_supplier IS NOT NULL THEN
    UPDATE public.suppliers
    SET due_balance = GREATEST(COALESCE(due_balance,0) - v_old_due, 0)
    WHERE id = v_old_supplier;
  END IF;
  IF p_supplier_id IS NOT NULL THEN
    UPDATE public.suppliers
    SET due_balance = COALESCE(due_balance,0) + v_due
    WHERE id = p_supplier_id;
  END IF;
END;
$$;
