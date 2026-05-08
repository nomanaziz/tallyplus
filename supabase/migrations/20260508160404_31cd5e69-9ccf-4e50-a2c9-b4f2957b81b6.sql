-- Fix push_subscriptions: prevent registering or editing other users' push endpoints

-- INSERT: only allow the signed-in user to register subscriptions for themselves
DROP POLICY IF EXISTS "users insert own push sub" ON public.push_subscriptions;
CREATE POLICY "users insert own push sub"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: only the owner (or an admin) can update a subscription row
DROP POLICY IF EXISTS "users update own push sub" ON public.push_subscriptions;
CREATE POLICY "users update own push sub"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Allow owners to also read their own subscription rows (admins already can).
DROP POLICY IF EXISTS "users read own push sub" ON public.push_subscriptions;
CREATE POLICY "users read own push sub"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));