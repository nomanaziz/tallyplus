import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { useShop } from "./shop";
import { presetForDbRole, hasPerm, type PermissionMap } from "./permissions";

type Ctx = {
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  perms: PermissionMap;
  can: (group: string, item: string) => boolean;
  canGroup: (group: string) => boolean;
};

const PermCtx = createContext<Ctx>({
  loading: true,
  isOwner: false,
  isAdmin: false,
  perms: {},
  can: () => false,
  canGroup: () => false,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { current } = useShop();
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [perms, setPerms] = useState<PermissionMap>({});

  useEffect(() => {
    if (!user || !current) {
      setLoading(false);
      setIsOwner(false);
      setIsAdmin(false);
      setPerms({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      // Single RPC: admin flag + owner flag + member role/perms in one round-trip
      const { data, error } = await supabase.rpc("my_shop_perms", { _shop_id: current.id });
      if (cancelled) return;
      if (error) {
        console.error("[perms] my_shop_perms rpc failed", error);
        setLoading(false);
        return;
      }
      const payload = (data ?? {}) as {
        is_admin: boolean;
        is_owner: boolean;
        role: string | null;
        permissions: PermissionMap | null;
      };
      const adminFlag = !!payload.is_admin;
      const ownerFlag = !!payload.is_owner;
      let resolved: PermissionMap = {};
      if (adminFlag || ownerFlag) {
        resolved = presetForDbRole("owner");
      } else if (payload.role) {
        const memberPerms = (payload.permissions ?? {}) as PermissionMap;
        if (memberPerms && Object.keys(memberPerms).length > 0) {
          resolved = memberPerms;
        } else {
          resolved = presetForDbRole(payload.role);
        }
      }
      setIsAdmin(adminFlag);
      setIsOwner(ownerFlag);
      setPerms(resolved);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, current?.id]);

  const value = useMemo<Ctx>(() => ({
    loading,
    isOwner,
    isAdmin,
    perms,
    can: (g, i) => isOwner || isAdmin || hasPerm(perms, g, i),
    canGroup: (g) => isOwner || isAdmin || (Array.isArray(perms[g]) && perms[g].length > 0),
  }), [loading, isOwner, isAdmin, perms]);

  return <PermCtx.Provider value={value}>{children}</PermCtx.Provider>;
}

export function usePermissions() { return useContext(PermCtx); }
