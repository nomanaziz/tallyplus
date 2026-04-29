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
  shop_type_code: string | null;
  owner_id: string;
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

export function ShopProvider({ children, initialShops }: { children: ReactNode; initialShops?: Shop[] }) {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>(initialShops ?? []);
  const [current, setCurrentState] = useState<Shop | null>(null);
  const [hasLoaded, setHasLoaded] = useState<boolean>(!!initialShops);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cachedCurrent = localStorage.getItem("tp_shop_current");
    if (!cachedCurrent) return;
    try {
      setCurrentState(JSON.parse(cachedCurrent) as Shop);
    } catch {
      localStorage.removeItem("tp_shop_current");
    }
  }, []);

  const refresh = async () => {
    if (!user) {
      setShops([]);
      setCurrentState(null);
      setHasLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("shops")
      .select("id,name,slug,logo_url,address,phone,currency,shop_type_code,owner_id")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    const list = (data as Shop[] | null) ?? [];
    setShops(list);
    const savedId = typeof window !== "undefined" ? localStorage.getItem("tp_shop_id") : null;
    // Validate cached shop is still in the user's accessible list; fallback to first.
    const found = list.find((s) => s.id === savedId) ?? list[0] ?? null;
    setCurrentState(found);
    if (typeof window !== "undefined") {
      if (found) {
        localStorage.setItem("tp_shop_current", JSON.stringify(found));
        localStorage.setItem("tp_shop_id", found.id);
      } else {
        localStorage.removeItem("tp_shop_current");
        localStorage.removeItem("tp_shop_id");
      }
    }
    setHasLoaded(true);
  };

  useEffect(() => {
    // If parent already seeded shops via initialShops, skip the duplicate fetch.
    if (initialShops && initialShops.length >= 0 && !hasLoaded) {
      // hasLoaded is already true via initial state, but keep guard explicit.
      return;
    }
    if (initialShops) {
      // Pick current from cached id without refetching.
      const savedId = typeof window !== "undefined" ? localStorage.getItem("tp_shop_id") : null;
      const found = initialShops.find((s) => s.id === savedId) ?? initialShops[0] ?? null;
      setCurrentState(found);
      if (typeof window !== "undefined" && found) {
        localStorage.setItem("tp_shop_id", found.id);
        localStorage.setItem("tp_shop_current", JSON.stringify(found));
      }
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setCurrent = (s: Shop) => {
    setCurrentState(s);
    if (typeof window !== "undefined") {
      localStorage.setItem("tp_shop_id", s.id);
      localStorage.setItem("tp_shop_current", JSON.stringify(s));
    }
  };

  return (
    <ShopCtx.Provider value={{ shops, current, setCurrent, refresh, loading: !hasLoaded }}>{children}</ShopCtx.Provider>
  );
}

export const useShop = () => useContext(ShopCtx);