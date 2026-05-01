
-- Admin profiles table for permissions and super-admin protection
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  is_super BOOLEAN NOT NULL DEFAULT false,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_profiles_email_key
  ON public.admin_profiles (lower(email)) WHERE email IS NOT NULL;

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Helper: is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = _user_id AND is_super = true
  )
$$;

-- Helper: has admin permission key (super => always true)
CREATE OR REPLACE FUNCTION public.has_admin_perm(_user_id UUID, _key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_super_admin(_user_id) THEN true
    ELSE COALESCE(
      (SELECT (permissions ->> _key)::boolean
         FROM public.admin_profiles
         WHERE user_id = _user_id),
      false
    )
  END
$$;

-- RLS policies
DROP POLICY IF EXISTS "admins read admin_profiles" ON public.admin_profiles;
CREATE POLICY "admins read admin_profiles" ON public.admin_profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "super admin insert admin_profiles" ON public.admin_profiles;
CREATE POLICY "super admin insert admin_profiles" ON public.admin_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "super admin update admin_profiles" ON public.admin_profiles;
CREATE POLICY "super admin update admin_profiles" ON public.admin_profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "self update own credentials email" ON public.admin_profiles;
CREATE POLICY "self update own credentials email" ON public.admin_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "super admin delete admin_profiles" ON public.admin_profiles;
CREATE POLICY "super admin delete admin_profiles" ON public.admin_profiles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) AND is_super = false);

-- Trigger: prevent demoting/deleting super admin
CREATE OR REPLACE FUNCTION public.tg_protect_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_super THEN
      RAISE EXCEPTION 'super_admin_protected: super admin cannot be deleted';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_super AND NEW.is_super = false THEN
      RAISE EXCEPTION 'super_admin_protected: super admin cannot be demoted';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS protect_super_admin ON public.admin_profiles;
CREATE TRIGGER protect_super_admin
  BEFORE UPDATE OR DELETE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_protect_super_admin();

-- Trigger: prevent removing admin role from super admin via user_roles
CREATE OR REPLACE FUNCTION public.tg_protect_super_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'admin' AND public.is_super_admin(OLD.user_id) THEN
    RAISE EXCEPTION 'super_admin_protected: cannot remove admin role from super admin';
  END IF;
  RETURN OLD;
END
$$;

DROP TRIGGER IF EXISTS protect_super_admin_role ON public.user_roles;
CREATE TRIGGER protect_super_admin_role
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.tg_protect_super_admin_role();

-- updated_at trigger
DROP TRIGGER IF EXISTS admin_profiles_updated_at ON public.admin_profiles;
CREATE TRIGGER admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed: existing admins → admin_profiles (first one becomes super)
INSERT INTO public.admin_profiles (user_id, email, full_name, is_super, permissions)
SELECT
  ur.user_id,
  NULL,
  p.full_name,
  CASE WHEN ur.user_id = (
    SELECT user_id FROM public.user_roles
    WHERE role = 'admin'
    ORDER BY (SELECT created_at FROM auth.users u WHERE u.id = user_roles.user_id) ASC
    LIMIT 1
  ) THEN true ELSE false END,
  '{"users":true,"marketplace":true,"marketplace_categories":true,"subscription_requests":true,"plans":true,"subscriptions":true,"platform_admins":true}'::jsonb
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin'
ON CONFLICT (user_id) DO NOTHING;
