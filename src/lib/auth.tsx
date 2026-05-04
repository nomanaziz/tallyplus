import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { getDeviceId, getDeviceLabel } from "./device-id";
import { toast } from "sonner";

type Profile = {
  id: string;
  phone: string | null;
  full_name: string | null;
  language: string;
  pin_hash: string | null;
  avatar_url: string | null;
};

type Sub = {
  id: string;
  status: string;
  expires_at: string;
  plan_id: string;
};

type Ctx = {
  loading: boolean;
  accountReady: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isOwner: boolean;
  hasActiveSubscription: boolean;
  subscription: Sub | null;
  adminPermissions: Record<string, boolean> | null;
  isSuperAdmin: boolean;
  adminEmail: string | null;
  refresh: () => Promise<void>;
  ensureProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  loading: true,
  accountReady: false,
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isOwner: false,
  hasActiveSubscription: false,
  subscription: null,
  adminPermissions: null,
  isSuperAdmin: false,
  adminEmail: null,
  refresh: async () => {},
  ensureProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [subscription, setSubscription] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState<Record<string, boolean> | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const loadProfile = async (_uid: string) => {
    // Single round-trip: profile + admin flag + active subscription
    const { data, error } = await supabase.rpc("my_account");
    if (error) {
      console.error("[auth] my_account rpc failed", error);
      setProfileLoaded(true);
      return;
    }
    const payload = (data ?? {}) as {
      profile: Profile | null;
      is_admin: boolean;
      is_owner?: boolean;
      subscription: Sub | null;
    };
    setProfile(payload.profile ?? null);
    setIsAdmin(!!payload.is_admin);
    setIsOwner(!!payload.is_owner);
    setSubscription(payload.subscription ?? null);
    if (payload.is_admin) {
      const { data: ap } = await supabase
        .from("admin_profiles")
        .select("permissions,is_super,email")
        .eq("user_id", _uid)
        .maybeSingle();
      setAdminPermissions((ap?.permissions as Record<string, boolean>) ?? {});
      setIsSuperAdmin(!!ap?.is_super);
      setAdminEmail((ap?.email as string) ?? null);
    } else {
      setAdminPermissions(null);
      setIsSuperAdmin(false);
      setAdminEmail(null);
    }
    setProfileLoaded(true);
  };

  useEffect(() => {
    let initialized = false;
    const finish = () => {
      if (!initialized) {
        initialized = true;
        setLoading(false);
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      finish();
      if (!s?.user) {
        setProfile(null);
        setIsAdmin(false);
        setIsOwner(false);
        setSubscription(null);
        setProfileLoaded(false);
        setAdminPermissions(null);
        setIsSuperAdmin(false);
        setAdminEmail(null);
      }
    });
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession((cur) => cur ?? s);
        finish();
      })
      .catch(() => finish());
    // Hard safety: never let the splash hang forever
    const t = setTimeout(finish, 4000);
    return () => {
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  useEffect(() => {
    if (!session?.user) return;
    setProfileLoaded(false);
    void loadProfile(session.user.id);
  }, [session?.user?.id]);

  // Lazily load profile/roles/subscription only when something requests it
  // (e.g. when entering the /app layout). Keeps public pages light.
  const ensureProfile = async () => {
    if (session?.user && !profileLoaded) await loadProfile(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("tp_pin_unlocked");
    }
  };

  // Two-device limit: register this device on sign-in and heartbeat to detect
  // remote sign-out (when user logs in on a 3rd device, this device is evicted).
  useEffect(() => {
    if (!session?.user) return;
    const deviceId = getDeviceId();
    let cancelled = false;
    let registered = false;
    let warned = false;
    let consecutiveMisses = 0;

    const register = async () => {
      try {
        const { error } = await supabase.rpc("register_active_device", {
          _device_id: deviceId,
          _user_agent: getDeviceLabel(),
        });
        if (!error) registered = true;
      } catch { /* ignore */ }
    };
    void register();

    const tick = async () => {
      if (cancelled) return;
      // Don't heartbeat until we successfully registered, otherwise the
      // server will (correctly) report "not allowed" and we'd kick the user.
      if (!registered) {
        await register();
        return;
      }
      // Skip when tab is hidden — saves churn and avoids racing with another
      // tab on the same device that just registered.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const { data, error } = await supabase.rpc("heartbeat_active_device", { _device_id: deviceId });
        if (cancelled) return;
        if (error) return;
        const allowed = (data as { ok?: boolean; allowed?: boolean } | null)?.allowed;
        if (allowed === false) {
          consecutiveMisses += 1;
          // Require two consecutive misses before evicting, so a transient
          // race (e.g. another tab re-registering) doesn't kick the user.
          if (consecutiveMisses < 2) {
            // Try to re-register defensively — maybe our row got cleaned.
            registered = false;
            await register();
            return;
          }
          if (!warned) {
            warned = true;
            toast.error("অন্য device থেকে এই session শেষ করা হয়েছে");
          }
          cancelled = true;
          await supabase.auth.signOut();
        } else {
          consecutiveMisses = 0;
        }
      } catch { /* ignore */ }
    };
    const handle = window.setInterval(tick, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session?.user?.id]);

  return (
    <AuthCtx.Provider
      value={{
        loading,
        accountReady: !session?.user || profileLoaded,
        session,
        user: session?.user ?? null,
        profile,
        isAdmin,
        isOwner,
        hasActiveSubscription: !!subscription,
        subscription,
        adminPermissions,
        isSuperAdmin,
        adminEmail,
        refresh,
        ensureProfile,
        signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);