import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserRound, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import {
  FEATURE_GROUPS,
  ROLE_PRESETS,
  togglePerm,
  hasPerm,
  type PermissionMap,
  type RoleKey,
} from "@/lib/permissions";
import { NewRoleDialog } from "./NewRoleDialog";
import { toast } from "sonner";

type CustomRole = { id: string; name: string; permissions: PermissionMap };

export function NewUserAccessDialog({
  open,
  onOpenChange,
  customRoles,
  onCustomRoleCreated,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customRoles: CustomRole[];
  onCustomRoleCreated: (r: CustomRole) => void;
  onSaved: () => void;
}) {
  const { lang } = useI18n();
  const { current } = useShop();

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");

  const [roleKey, setRoleKey] = useState<RoleKey | string>("EMPLOYEE");
  const [perms, setPerms] = useState<PermissionMap>(ROLE_PRESETS.EMPLOYEE);
  const [busy, setBusy] = useState(false);
  const [openNewRole, setOpenNewRole] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setFullName("");
      setPhone("");
      setAddress("");
      setEmail("");
      setRoleKey("EMPLOYEE");
      setPerms(ROLE_PRESETS.EMPLOYEE);
    }
  }, [open]);

  const onPickRole = (key: RoleKey | string) => {
    setRoleKey(key);
    if (key === "EMPLOYEE" || key === "MANAGER" || key === "OWNER") {
      setPerms(ROLE_PRESETS[key as RoleKey]);
    } else {
      const cr = customRoles.find((c) => c.id === key);
      if (cr) setPerms(cr.permissions || {});
    }
  };

  const validateStep1 = () => {
    if (!fullName.trim()) {
      toast.error(lang === "bn" ? "নাম দিন" : "Name required");
      return false;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error(lang === "bn" ? "সঠিক ফোন নম্বর দিন" : "Valid phone required");
      return false;
    }
    return true;
  };

  const dbRole = useMemo<"owner" | "manager" | "cashier">(() => {
    if (roleKey === "OWNER") return "owner";
    if (roleKey === "MANAGER") return "manager";
    return "cashier";
  }, [roleKey]);

  const save = async () => {
    if (!current) return;
    const digits = phone.replace(/\D/g, "");
    const normalizedPhone = digits.startsWith("88") ? digits : "88" + digits;

    setBusy(true);
    // Find existing profile by phone (preferred) — keep it nullable, employee may not be a registered user yet
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (!prof) {
      setBusy(false);
      toast.error(
        lang === "bn"
          ? "এই ফোনে রেজিস্টার্ড ইউজার নেই। আগে ইউজারকে রেজিস্টার করতে বলুন।"
          : "No registered user with this phone. Ask them to register first.",
      );
      return;
    }

    const customRoleId =
      roleKey === "EMPLOYEE" || roleKey === "MANAGER" || roleKey === "OWNER" ? null : roleKey;

    const { error } = await supabase.from("shop_members").insert({
      shop_id: current.id,
      user_id: prof.id,
      role: dbRole,
      full_name: fullName.trim(),
      email: email.trim() || null,
      address: address.trim() || null,
      permissions: perms as any,
      custom_role_id: customRoleId,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "এক্সেস দেওয়া হয়েছে" : "Access granted");
    onOpenChange(false);
    onSaved();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-center text-base font-bold">New User Access</DialogTitle>
          </DialogHeader>

          <div className="max-h-[72vh] overflow-y-auto px-5 py-4">
            {step === 1 ? (
              <div className="grid gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <UserRound className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-sky-600 hover:underline"
                    onClick={() => toast.info(lang === "bn" ? "শীঘ্রই আসছে" : "Coming soon")}
                  >
                    [{lang === "bn" ? "ইউজার এর ছবি যুক্ত করুন" : "Add user photo"}]
                  </button>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-sm">
                    {lang === "bn" ? "নাম" : "Name"} <span className="text-rose-500">*</span>
                  </Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={lang === "bn" ? "নাম" : "Name"} />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-sm">
                    {lang === "bn" ? "ফোন নম্বর" : "Phone"} <span className="text-rose-500">*</span>
                  </Label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-2 text-sm">🇧🇩 +88</span>
                    <Input
                      className="rounded-l-none"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-sm">{lang === "bn" ? "ঠিকানা" : "Address"}</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={lang === "bn" ? "ঠিকানা" : "Address"} />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-sm">{lang === "bn" ? "ইমেইল" : "Email"}</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={lang === "bn" ? "ইমেইল" : "Email"} />
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div>
                  <div className="mb-2 text-sm">
                    role <span className="text-rose-500">*</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["EMPLOYEE", "MANAGER", "OWNER"] as const).map((k) => {
                      const active = roleKey === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => onPickRole(k)}
                          className={
                            "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold " +
                            (active
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                              : "border-border bg-background text-muted-foreground hover:bg-accent")
                          }
                        >
                          <Checkbox checked={active} className="h-3.5 w-3.5 pointer-events-none" />
                          {k}
                        </button>
                      );
                    })}
                    {customRoles.map((cr) => {
                      const active = roleKey === cr.id;
                      return (
                        <button
                          key={cr.id}
                          type="button"
                          onClick={() => onPickRole(cr.id)}
                          className={
                            "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold " +
                            (active
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                              : "border-border bg-background text-muted-foreground hover:bg-accent")
                          }
                        >
                          <Checkbox checked={active} className="h-3.5 w-3.5 pointer-events-none" />
                          {cr.name.toUpperCase()}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setOpenNewRole(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-emerald-500 bg-background px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {lang === "bn" ? "নতুন পদবী যোগ" : "Add new role"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-semibold">
                    {lang === "bn" ? "যেসব ফিচারে এক্সেস পাবে" : "Feature access"}
                  </div>
                  <div className="space-y-3">
                    {FEATURE_GROUPS.filter((g) => (perms[g.key] ?? []).length > 0).map((g) => (
                      <div key={g.key}>
                        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
                          <span className="text-base">{g.icon}</span>
                          <span>{lang === "bn" ? g.title_bn : g.title_en}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-1">
                          {g.items.map((it) => {
                            const on = hasPerm(perms, g.key, it.key);
                            return (
                              <button
                                type="button"
                                key={it.key}
                                onClick={() => setPerms(togglePerm(perms, g.key, it.key))}
                                className={
                                  "inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] " +
                                  (on
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : "border-dashed border-muted-foreground/30 text-muted-foreground")
                                }
                              >
                                <Checkbox checked={on} className="h-3 w-3 pointer-events-none" />
                                <span>{lang === "bn" ? it.label_bn : it.label_en}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3">
            {step === 1 ? (
              <Button
                className="h-11 w-full bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
              >
                {lang === "bn" ? "পরবর্তী ধাপ" : "Next step"}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="h-11 flex-1" onClick={() => setStep(1)}>
                  {lang === "bn" ? "আগের ধাপ" : "Back"}
                </Button>
                <Button
                  disabled={busy}
                  onClick={save}
                  className="h-11 flex-[2] bg-foreground text-background hover:bg-foreground/90"
                >
                  {busy ? "..." : lang === "bn" ? "সেভ করুন" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NewRoleDialog
        open={openNewRole}
        onOpenChange={setOpenNewRole}
        onCreated={(r) => {
          onCustomRoleCreated(r);
          onPickRole(r.id);
        }}
      />
    </>
  );
}