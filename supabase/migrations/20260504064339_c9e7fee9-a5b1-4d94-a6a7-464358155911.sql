
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS advance_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  consumer_user_id uuid,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  division text,
  district text,
  upazila text,
  area text,
  scheduled_at timestamptz,
  note text,
  service_name text NOT NULL,
  service_price numeric NOT NULL DEFAULT 0,
  advance_amount numeric NOT NULL DEFAULT 0,
  advance_paid boolean NOT NULL DEFAULT false,
  advance_payment_method text,
  advance_txn_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_bookings_shop ON public.service_bookings(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_bookings_consumer ON public.service_bookings(consumer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_bookings_phone ON public.service_bookings(customer_phone);

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

-- Shop members can read/manage their bookings
CREATE POLICY "Shop members read bookings" ON public.service_bookings
  FOR SELECT USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members update bookings" ON public.service_bookings
  FOR UPDATE USING (public.is_shop_member(auth.uid(), shop_id));
CREATE POLICY "Shop members delete bookings" ON public.service_bookings
  FOR DELETE USING (public.is_shop_member(auth.uid(), shop_id));

-- Consumer reads own bookings (by user id or phone match)
CREATE POLICY "Consumer reads own bookings" ON public.service_bookings
  FOR SELECT USING (
    consumer_user_id = auth.uid()
    OR (auth.uid() IS NOT NULL AND regexp_replace(customer_phone, '[^0-9]', '', 'g') = ANY(public.user_phones(auth.uid())))
  );

-- Anyone (including guests) can insert a booking
CREATE POLICY "Anyone can create booking" ON public.service_bookings
  FOR INSERT WITH CHECK (true);

CREATE TRIGGER trg_service_bookings_updated_at
  BEFORE UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_notify_new_service_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_shop_members(
    NEW.shop_id,
    'নতুন সার্ভিস বুকিং — ' || COALESCE(NEW.service_name, 'সার্ভিস'),
    'গ্রাহক: ' || COALESCE(NEW.customer_name, '') || ' • ফোন: ' || COALESCE(NEW.customer_phone, ''),
    '/app/services?tab=bookings',
    'service_booking'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_service_booking
  AFTER INSERT ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_service_booking();
