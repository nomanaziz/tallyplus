import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type SubStatus = {
  loading: boolean;
  planCode: string;          // 'trial' | 'free' | 'monthly' | ...
  status: string | null;     // 'trial' | 'active' | 'expired' | null
  expiresAt: string | null;
  daysLeft: number | null;
  isTrial: boolean;
  isExpired: boolean;        // had a trial/sub but it ended → on free fallback
  isExpiringSoon: boolean;
  warnDaysBefore: number;
  refresh: () => void;
};

export function useSubscriptionStatus(): SubStatus {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const [state, setState] = useState<Omit<SubStatus, "refresh">>({
    loading: true,
    planCode: "free",
    status: null,
    expiresAt: null,
    daysLeft: null,
    isTrial: false,
    isExpired: false,
    isExpiringSoon: false,
    warnDaysBefore: 5,
  });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    void (async () => {
      const [{ data: subRows }, { data: settings }, { data: hadAny }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("status,expires_at,subscription_plans!inner(code)")
          .eq("user_id", user.id)
          .in("status", ["active", "trial"])
          .gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("trial_settings").select("warn_days_before").eq("id", true).maybeSingle(),
        supabase.from("subscriptions").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      const warn = (settings as { warn_days_before?: number } | null)?.warn_days_before ?? 5;
      const row = subRows as
        | { status: string; expires_at: string; subscription_plans: { code: string } }
        | null;
      if (!row) {
        setState({
          loading: false,
          planCode: "free",
          status: null,
          expiresAt: null,
          daysLeft: null,
          isTrial: false,
          isExpired: !!hadAny, // had a sub before, none active now
          isExpiringSoon: false,
          warnDaysBefore: warn,
        });
        return;
      }
      const expiresMs = new Date(row.expires_at).getTime();
      const days = Math.max(0, Math.ceil((expiresMs - Date.now()) / 86400000));
      const isTrial = row.status === "trial";
      setState({
        loading: false,
        planCode: row.subscription_plans.code,
        status: row.status,
        expiresAt: row.expires_at,
        daysLeft: days,
        isTrial,
        isExpired: false,
        isExpiringSoon: isTrial && days <= warn,
        warnDaysBefore: warn,
      });
    })();
    return () => { cancelled = true; };
  }, [user, tick]);

  return { ...state, refresh };
}