
-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  display_mode text NULL,
  device_type text NULL,
  user_agent text NULL,
  language text NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL
);

CREATE INDEX idx_push_sub_user ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_sub_display_mode ON public.push_subscriptions(display_mode);
CREATE INDEX idx_push_sub_device_type ON public.push_subscriptions(device_type);
CREATE INDEX idx_push_sub_active ON public.push_subscriptions(revoked_at) WHERE revoked_at IS NULL;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can read push subs"
  ON public.push_subscriptions FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "admin can delete push subs"
  ON public.push_subscriptions FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Push campaigns
CREATE TABLE public.push_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  url text NULL,
  icon text NULL,
  target_segment jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_count int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  sent_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin can read push campaigns"
  ON public.push_campaigns FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "admin can insert push campaigns"
  ON public.push_campaigns FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- RPC: upsert subscription (anyone can call, including anon)
CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  _endpoint text,
  _p256dh text,
  _auth text,
  _display_mode text,
  _device_type text,
  _user_agent text,
  _language text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _endpoint IS NULL OR length(_endpoint) < 8 OR _p256dh IS NULL OR _auth IS NULL THEN
    RAISE EXCEPTION 'invalid_subscription';
  END IF;

  INSERT INTO public.push_subscriptions(
    user_id, endpoint, p256dh, auth, display_mode, device_type, user_agent, language
  ) VALUES (
    auth.uid(), _endpoint, _p256dh, _auth, _display_mode, _device_type, _user_agent, _language
  )
  ON CONFLICT (endpoint) DO UPDATE
    SET p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        display_mode = COALESCE(EXCLUDED.display_mode, public.push_subscriptions.display_mode),
        device_type = COALESCE(EXCLUDED.device_type, public.push_subscriptions.device_type),
        user_agent = COALESCE(EXCLUDED.user_agent, public.push_subscriptions.user_agent),
        language = COALESCE(EXCLUDED.language, public.push_subscriptions.language),
        user_id = COALESCE(EXCLUDED.user_id, public.push_subscriptions.user_id),
        last_seen_at = now(),
        revoked_at = NULL
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(text,text,text,text,text,text,text) TO anon, authenticated;

-- RPC: count audience by segment (admin only)
CREATE OR REPLACE FUNCTION public.push_audience_count(
  _display_mode text DEFAULT NULL,
  _device_type text DEFAULT NULL,
  _logged_in_only boolean DEFAULT false
) RETURNS int
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.push_subscriptions
  WHERE revoked_at IS NULL
    AND public.is_admin(auth.uid())
    AND (_display_mode IS NULL OR display_mode = _display_mode)
    AND (_device_type IS NULL OR device_type = _device_type)
    AND (NOT _logged_in_only OR user_id IS NOT NULL);
$$;

GRANT EXECUTE ON FUNCTION public.push_audience_count(text,text,boolean) TO authenticated;
