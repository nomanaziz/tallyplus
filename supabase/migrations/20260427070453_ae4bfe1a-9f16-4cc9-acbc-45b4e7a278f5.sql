-- 1. Create payment_methods table
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'mobile',
  account_number text NOT NULL DEFAULT '',
  account_holder text,
  extra_info text,
  instructions_bn text,
  instructions_en text,
  color text NOT NULL DEFAULT '#E2136B',
  icon_emoji text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods public read active"
ON public.payment_methods FOR SELECT
USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "payment_methods admin write"
ON public.payment_methods FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER set_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_payment_methods_sort ON public.payment_methods (sort_order, created_at);

-- Seed from old payment_gateway_settings.extra.manual
DO $$
DECLARE
  v_manual jsonb;
  v_order int := 0;
BEGIN
  SELECT extra->'manual' INTO v_manual
  FROM public.payment_gateway_settings WHERE id = true LIMIT 1;

  IF v_manual IS NOT NULL THEN
    IF (v_manual->'bkash'->>'number') IS NOT NULL AND (v_manual->'bkash'->>'number') <> '' THEN
      INSERT INTO public.payment_methods (name, type, account_number, instructions_bn, instructions_en, color, icon_emoji, sort_order)
      VALUES ('bKash ' || COALESCE(v_manual->'bkash'->>'type', 'Personal'), 'mobile',
        v_manual->'bkash'->>'number', v_manual->>'instructions_bn', v_manual->>'instructions_en',
        '#E2136B', '📱', v_order);
      v_order := v_order + 1;
    END IF;

    IF (v_manual->'nagad'->>'number') IS NOT NULL AND (v_manual->'nagad'->>'number') <> '' THEN
      INSERT INTO public.payment_methods (name, type, account_number, instructions_bn, instructions_en, color, icon_emoji, sort_order)
      VALUES ('Nagad ' || COALESCE(v_manual->'nagad'->>'type', 'Personal'), 'mobile',
        v_manual->'nagad'->>'number', v_manual->>'instructions_bn', v_manual->>'instructions_en',
        '#EB7100', '📱', v_order);
      v_order := v_order + 1;
    END IF;

    IF (v_manual->'rocket'->>'number') IS NOT NULL AND (v_manual->'rocket'->>'number') <> '' THEN
      INSERT INTO public.payment_methods (name, type, account_number, instructions_bn, instructions_en, color, icon_emoji, sort_order)
      VALUES ('Rocket ' || COALESCE(v_manual->'rocket'->>'type', 'Personal'), 'mobile',
        v_manual->'rocket'->>'number', v_manual->>'instructions_bn', v_manual->>'instructions_en',
        '#8B2C8E', '📱', v_order);
      v_order := v_order + 1;
    END IF;

    IF (v_manual->'bank'->>'account') IS NOT NULL AND (v_manual->'bank'->>'account') <> '' THEN
      INSERT INTO public.payment_methods (name, type, account_number, extra_info, instructions_bn, instructions_en, color, icon_emoji, sort_order)
      VALUES (COALESCE(v_manual->'bank'->>'name', 'Bank Account'), 'bank',
        v_manual->'bank'->>'account',
        CASE WHEN (v_manual->'bank'->>'branch') IS NOT NULL AND (v_manual->'bank'->>'branch') <> ''
             THEN 'শাখা / Branch: ' || (v_manual->'bank'->>'branch') ELSE NULL END,
        v_manual->>'instructions_bn', v_manual->>'instructions_en',
        '#1E40AF', '🏦', v_order);
    END IF;
  END IF;
END $$;