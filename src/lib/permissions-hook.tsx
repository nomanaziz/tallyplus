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
      // Check admin role
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const adminFlag = (roles ?? []).some((r) => r.role === "admin");

      // Check shop ownership
      const { data: shopRow } = await supabase
        .from("shops").select("owner_id").eq("id", current.id).maybeSingle();
      const ownerFlag = shopRow?.owner_id === user.id;

      let resolved: PermissionMap = {};
      if (adminFlag || ownerFlag) {
        resolved = presetForDbRole("owner");
      } else {
        const { data: member } = await supabase
          .from("shop_members")
          .select("role,permissions,custom_role_id")
          .eq("shop_id", current.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (member) {
          const memberPerms = (member.permissions ?? {}) as PermissionMap;
          if (memberPerms && Object.keys(memberPerms).length > 0) {
            resolved = memberPerms;
          } else if (member.custom_role_id) {
            const { data: cr } = await supabase
              .from("shop_custom_roles")
              .select("permissions")
              .eq("id", member.custom_role_id)
              .maybeSingle();
            resolved = ((cr?.permissions as PermissionMap) ?? {}) || presetForDbRole(member.role);
            if (Object.keys(resolved).length === 0) resolved = presetForDbRole(member.role);
          } else {
            resolved = presetForDbRole(member.role);
          }
        }
      }

      if (cancelled) return;
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
