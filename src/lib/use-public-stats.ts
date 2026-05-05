import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicStats = {
  shops: number;
  owners: number;
  customers: number;
  totalUsers: number;
};

export function usePublicStats() {
  const q = useQuery<PublicStats>({
    queryKey: ["public-stats"],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("public-stats", { method: "GET" });
      if (error) throw error;
      return (data ?? { shops: 0, owners: 0, customers: 0, totalUsers: 0 }) as PublicStats;
    },
  });
  return {
    shops: q.data?.shops ?? 0,
    owners: q.data?.owners ?? 0,
    customers: q.data?.customers ?? 0,
    totalUsers: q.data?.totalUsers ?? 0,
    isLoading: q.isLoading,
  };
}