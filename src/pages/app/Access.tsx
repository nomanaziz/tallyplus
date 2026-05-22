import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Copy, Plus, RefreshCw, Users } from "lucide-react";
import { useShop } from "@/lib/shop";
import { useI18n, bnNum } from "@/lib/i18n";
import { shopMembersQuery, customRolesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/app/EmptyState";
import { NewUserAccessDialog } from "@/components/app/NewUserAccessDialog";
import { FEATURE_GROUPS, hasPerm, presetForDbRole, type PermissionMap } from "@/lib/permissions";
import { toast } from "sonner";

type Member = {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  is_owner: boolean;
  permissions: PermissionMap | null;
  custom_role_id: string | null;
};



import { RequirePerm } from "@/components/app/RequirePerm";
function GuardedAccessPage() {
  return <RequirePerm ownerOnly><AccessPage /></RequirePerm>;
}

function AccessPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const { data: raw } = useQuery(shopMembersQuery(current?.id ?? null));
  const { data: customRoles = [] } = useQuery(customRolesQuery(current?.id ?? null));
  const members: Member[] = useMemo(() => {
    if (!raw) return [];
    const list: Member[] = [];
    if (raw.ownerId) {
      const p = raw.profiles[raw.ownerId];
      list.push({
        id: "owner",
        user_id: raw.ownerId,
        role: "owner",
        full_name: p?.full_name ?? current?.name ?? null,
        phone: p?.phone ?? null,
        is_owner: true,
        permissions: null,
        custom_role_id: null,
      });
    }
    for (const r of raw.rows) {
      if (r.user_id === raw.ownerId) continue;
      const p = raw.profiles[r.user_id];
      list.push({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        full_name: (r as any).full_name ?? p?.full_name ?? null,
        phone: p?.phone ?? null,
        is_owner: false,
        permissions: ((r as any).permissions ?? null) as PermissionMap | null,
        custom_role_id: (r as any).custom_role_id ?? null,
      });
    }
    return list;
  }, [raw, current?.name]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  const load = async () => {
    await qc.invalidateQueries({ queryKey: ["shop", "members", current?.id] });
    await qc.invalidateQueries({ queryKey: ["shop", "custom_roles", current?.id] });
  };

  useEffect(() => {
    setSelected((prev) => prev ?? members[0] ?? null);
  }, [members]);

  const initials = (name: string | null) =>
    (name || "U").split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/auth` : "/";

  const effectivePerms = useMemo<PermissionMap>(() => {
    if (!selected) return {};
    if (selected.is_owner) return presetForDbRole("owner");
    if (selected.permissions && Object.keys(selected.permissions).length) return selected.permissions;
    if (selected.custom_role_id) {
      const cr = customRoles.find((c) => c.id === selected.custom_role_id);
      if (cr) return cr.permissions || {};
    }
    return presetForDbRole(selected.role);
  }, [selected, customRoles]);

  const roleLabel = (m: Member) => {
    if (m.is_owner) return "OWNER";
    if (m.custom_role_id) {
      const cr = customRoles.find((c) => c.id === m.custom_role_id);
      if (cr) return cr.name.toUpperCase();
    }
    return m.role.toUpperCase();
  };

  return (
    <div className="container px-4 py-4">
      <h1 className="text-xl font-extrabold md:text-2xl">{t("p7_Access_Management")}</h1>

      <div className="mt-4 grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Left: members list */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-semibold">
            <span>{lang === "bn" ? `এক্সেস পদবী (${bnNum(members.length)}) টি` : `Roles (${members.length})`}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {members.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title={t("p7_No_members_yet")} />
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className={
                    "flex items-center gap-3 rounded-lg border-2 p-3 text-left transition " +
                    (selected?.id === m.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent")
                  }
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {initials(m.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{m.full_name ?? (t("p7_Unknown"))}</span>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        {roleLabel(m)}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{m.phone ?? "—"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="border-t p-3">
            <Button className="h-11 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setOpenAdd(true)}>
              <Plus className="h-4 w-4" />
              {t("p7_Grant_new_access")}
            </Button>
          </div>
        </div>

        {/* Right: details */}
        <div className="rounded-xl border bg-card p-4">
          {selected ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {initials(selected.full_name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{selected.full_name ?? "—"}</span>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        {roleLabel(selected)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{selected.phone ?? "—"}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{t("p7_Send_app_link")}</div>
                    <div className="text-xs text-muted-foreground">{t("p7_User_can_log_in_with_their_pho")}</div>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => { void navigator.clipboard.writeText(inviteLink); toast.success(t("p7_Copied_2")); }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold">{t("p7_Feature_access")}</div>
                <div className="space-y-4">
                  {FEATURE_GROUPS.filter((g) => (effectivePerms[g.key] ?? []).length > 0).map((g) => (
                    <div key={g.key}>
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
                        <span>{g.icon}</span>
                        <span>{lang === "bn" ? g.title_bn : g.title_en}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items
                          .filter((it) => hasPerm(effectivePerms, g.key, it.key))
                          .map((it) => (
                            <span
                              key={it.key}
                              className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800"
                            >
                              <Checkbox checked className="h-3 w-3 pointer-events-none" />
                              <span>{lang === "bn" ? it.label_bn : it.label_en}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <EmptyState title={t("p7_Select_a_member")} />
          )}
        </div>
      </div>

      <NewUserAccessDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        customRoles={customRoles}
        onCustomRoleCreated={() => qc.invalidateQueries({ queryKey: ["shop", "custom_roles", current?.id] })}
        onSaved={load}
      />
    </div>
  );
}
export default GuardedAccessPage;
