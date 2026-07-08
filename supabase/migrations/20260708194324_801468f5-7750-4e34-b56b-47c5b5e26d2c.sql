-- Late fee configuration on investor loans
ALTER TABLE public.investor_loans
  ADD COLUMN IF NOT EXISTS late_fee_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_grace_days integer NOT NULL DEFAULT 0;

-- PIN verification RPC (uses pgcrypto crypt against bcrypt hash stored in profiles.pin_hash)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.verify_current_user_pin(_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  _hash text;
BEGIN
  SELECT pin_hash INTO _hash FROM public.profiles WHERE id = auth.uid();
  IF _hash IS NULL OR _pin IS NULL OR length(_pin) = 0 THEN
    RETURN false;
  END IF;
  RETURN extensions.crypt(_pin, _hash) = _hash;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_current_user_pin(text) TO authenticated;