import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UsageLimit = {
  allowed: boolean;
  used: number;
  limit: number; // -1 means unlimited
  plan_code: string;
};

export async function fetchUsageLimit(shopId: string, feature: string): Promise<UsageLimit> {
  const { data, error } = await supabase.rpc("check_usage_limit", { _shop_id: shopId, _feature: feature });
  if (error || !data) return { allowed: true, used: 0, limit: -1, plan_code: "free" };
  return data as unknown as UsageLimit;
}

export function useUsageLimit(shopId: string | null | undefined, feature: string) {
  const [data, setData] = useState<UsageLimit | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!shopId) { setData(null); return; }
    setLoading(true);
    const r = await fetchUsageLimit(shopId, feature);
    setData(r);
    setLoading(false);
  }, [shopId, feature]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { data, loading, refresh };
}

export function parseLimitError(message: string | undefined): { feature: string; limit: number } | null {
  if (!message) return null;
  const m = /limit_reached:\s*([a-z_]+):(-?\d+)/i.exec(message);
  if (!m) return null;
  return { feature: m[1], limit: parseInt(m[2], 10) };
}