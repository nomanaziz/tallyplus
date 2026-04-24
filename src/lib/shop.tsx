import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type Shop = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  currency: string;
};

const ShopCtx = createContext<{
  shops: Shop[];
  current: Shop | null;
  setCurrent: (s: Shop) => void;
  refresh: () => Promise<void>;
  loading: boolean;
}>({
  shops: [],
  current: null,
  setCurrent: () => {},
  refresh: async () => {},
  loading: true,
});

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [current, setCurrentState] = useState<Shop | null>(null);
  // Never block the UI on shop fetching; refresh runs silently in the background.
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refresh = async () => {
    if (!user) {
      setShops([]);
      setCurrentState(null);
      setHasLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("shops")
      .select("id,name,slug,logo_url,address,phone,currency")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    const list = (data as Shop[] | null) ?? [];
    setShops(list);
    const savedId = typeof window !== "undefined" ? localStorage.getItem("tp_shop_id") : null;
    const found = list.find((s) => s.id === savedId) ?? list[0] ?? null;
    setCurrentState((prev) => prev ?? found);
    setHasLoaded(true);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setCurrent = (s: Shop) => {
    setCurrentState(s);
    if (typeof window !== "undefined") localStorage.setItem("tp_shop_id", s.id);
  };

  return (
    <ShopCtx.Provider value={{ shops, current, setCurrent, refresh, loading: loading || !hasLoaded }}>{children}</ShopCtx.Provider>
  );
}

export const useShop = () => useContext(ShopCtx);