import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { FEATURE_GROUPS, isGroupFullyOn, toggleGroup, type PermissionMap } from "@/lib/permissions";
import { toast } from "sonner";

export function NewRoleDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (role: { id: string; name: string; permissions: PermissionMap }) => void;
}) {
  const { lang } = useI18n();
  const { current } = useShop();
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<PermissionMap>({});
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName("");
    setPerms({});
  };

  const save = async () => {
    if (!current) return;
    if (!name.trim()) {
      toast.error(lang === "bn" ? "পদবীর নাম দিন" : "Role name required");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("shop_custom_roles")
      .insert({ shop_id: current.id, name: name.trim(), permissions: perms as any })
      .select("id,name,permissions")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "পদবী যোগ হয়েছে" : "Role added");
    onCreated?.(data as any);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-center text-base font-bold">New Role</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <Label className="text-sm">
            {lang === "bn" ? "পদবীর নাম" : "Role name"} <span className="text-rose-500">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Role Name"
            className="mt-1.5"
          />

          <div className="mt-5 mb-2 text-sm font-semibold">
            {lang === "bn" ? "যেসব ফিচারে এক্সেস পাবে" : "Feature access"}
          </div>
          <div className="divide-y rounded-md border">
            {FEATURE_GROUPS.map((g) => {
              const on = isGroupFullyOn(perms, g.key);
              return (
                <div key={g.key} className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-base">{g.icon}</span>
                    <span>{lang === "bn" ? g.title_bn : g.title_en}</span>
                  </div>
                  <Switch
                    checked={on}
                    onCheckedChange={(v) => setPerms(toggleGroup(perms, g.key, v))}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t p-3">
          <Button
            onClick={save}
            disabled={busy}
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "..." : lang === "bn" ? "সেভ করুন" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}