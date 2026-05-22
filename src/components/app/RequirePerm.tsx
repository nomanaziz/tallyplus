import type { ReactNode } from "react";
import { usePermissions } from "@/lib/permissions-hook";
import { useI18n } from "@/lib/i18n";
import { ShieldAlert } from "lucide-react";

export function RequirePerm({
  group,
  item,
  ownerOnly,
  children,
}: {
  group?: string;
  item?: string;
  ownerOnly?: boolean;
  children: ReactNode;
}) {
  const { lang, t } = useI18n();
  const { loading, isOwner, isAdmin, can, canGroup } = usePermissions();

  if (loading) {
    return <div className="container px-4 py-8 text-sm text-muted-foreground">…</div>;
  }
  const allowed =
    isOwner || isAdmin ||
    (ownerOnly ? false : item ? can(group ?? "", item) : group ? canGroup(group) : false);

  if (!allowed) {
    return (
      <div className="container px-4 py-12">
        <div className="mx-auto max-w-md rounded-xl border bg-card p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold">
            {t("p7_Access_denied")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("p7_You_don_t_have_permission_to_v")}
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
