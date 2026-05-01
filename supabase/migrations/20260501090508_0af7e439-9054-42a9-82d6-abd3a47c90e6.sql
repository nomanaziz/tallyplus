
-- 1) SMS purchase request: extra columns for manual + online flow
ALTER TABLE public.sms_purchase_requests
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS txn_id text,
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_session_id text;

-- 2) payment_transactions: link to sms package for online flow
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS sms_package_id uuid REFERENCES public.sms_packages(id),
  ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id),
  ADD COLUMN IF NOT EXISTS kind text;

-- 3) Cleanup duplicate customers (same shop_id + same phone)
-- Keep oldest, merge sales.customer_id references, soft-delete the rest
DO $$
DECLARE
  r record;
  keep_id uuid;
  dup_ids uuid[];
BEGIN
  FOR r IN
    SELECT shop_id, phone
    FROM public.customers
    WHERE deleted_at IS NULL AND phone IS NOT NULL AND length(trim(phone)) > 0
    GROUP BY shop_id, phone
    HAVING count(*) > 1
  LOOP
    SELECT id INTO keep_id
    FROM public.customers
    WHERE shop_id = r.shop_id AND phone = r.phone AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    SELECT array_agg(id) INTO dup_ids
    FROM public.customers
    WHERE shop_id = r.shop_id AND phone = r.phone AND deleted_at IS NULL AND id <> keep_id;

    -- Repoint sales
    UPDATE public.sales SET customer_id = keep_id WHERE customer_id = ANY(dup_ids);
    -- Soft delete duplicates
    UPDATE public.customers SET deleted_at = now() WHERE id = ANY(dup_ids);
  END LOOP;
END $$;

-- 4) Cleanup duplicate suppliers
DO $$
DECLARE
  r record;
  keep_id uuid;
  dup_ids uuid[];
BEGIN
  FOR r IN
    SELECT shop_id, phone
    FROM public.suppliers
    WHERE deleted_at IS NULL AND phone IS NOT NULL AND length(trim(phone)) > 0
    GROUP BY shop_id, phone
    HAVING count(*) > 1
  LOOP
    SELECT id INTO keep_id
    FROM public.suppliers
    WHERE shop_id = r.shop_id AND phone = r.phone AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    SELECT array_agg(id) INTO dup_ids
    FROM public.suppliers
    WHERE shop_id = r.shop_id AND phone = r.phone AND deleted_at IS NULL AND id <> keep_id;

    UPDATE public.purchases SET supplier_id = keep_id WHERE supplier_id = ANY(dup_ids);
    UPDATE public.suppliers SET deleted_at = now() WHERE id = ANY(dup_ids);
  END LOOP;
END $$;

-- 5) Partial unique indexes to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS customers_shop_phone_unique
  ON public.customers(shop_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_shop_phone_unique
  ON public.suppliers(shop_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;
