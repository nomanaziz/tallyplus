import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserRound, Plus, Copy, MessageCircle, Phone, Check } from "lucide-react";
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

type ShareInfo = { phone: string; pin: string; loginUrl: string };

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
  const [pin, setPin] = useState("");

  const [roleKey, setRoleKey] = useState<RoleKey | string>("EMPLOYEE");
  const [perms, setPerms] = useState<PermissionMap>(ROLE_PRESETS.EMPLOYEE);
  const [busy, setBusy] = useState(false);
  const [openNewRole, setOpenNewRole] = useState(false);
  const [share, setShare] = useState<ShareInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setFullName("");
      setPhone("");
      setAddress("");
      setEmail("");
      setPin("");
      setRoleKey("EMPLOYEE");
      setPerms(ROLE_PRESETS.EMPLOYEE);
      setShare(null);
      setCopied(false);
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
    if (!/^\d{4}$/.test(pin)) {
      toast.error(lang === "bn" ? "৪ সংখ্যার PIN দিন" : "Enter 4-digit PIN");
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
    setBusy(true);
    try {
      // 1) Create the auth user with the PIN the owner chose
      const { data: created, error: fnErr } = await supabase.functions.invoke(
        "create-employee-user",
        { body: { phone, full_name: fullName.trim(), pin, overwrite_pin: true } },
      );
      if (fnErr) {
        const msg = (fnErr as { context?: { error?: string } })?.context?.error ?? fnErr.message;
        throw new Error(msg);
      }
      if (created?.error) throw new Error(created.error);
      const userId: string = created.user_id;
      const normalizedPhone: string = created.phone;

      // 2) Insert shop_member (or update if already a member of this shop)
      const customRoleId =
        roleKey === "EMPLOYEE" || roleKey === "MANAGER" || roleKey === "OWNER" ? null : roleKey;
      const { error: memberErr } = await supabase
        .from("shop_members")
        .upsert(
          {
            shop_id: current.id,
            user_id: userId,
            role: dbRole,
            full_name: fullName.trim(),
            email: email.trim() || null,
            address: address.trim() || null,
            permissions: perms as any,
            custom_role_id: customRoleId,
          },
          { onConflict: "shop_id,user_id" },
        );
      if (memberErr) throw memberErr;

      // 3) Build the shareable login link (phone digits, login screen)
      const localPhone = normalizedPhone.replace(/^\+?880/, "0");
      const loginUrl = `${window.location.origin}/auth?phone=${encodeURIComponent(localPhone)}`;
      setShare({ phone: localPhone, pin, loginUrl });
      onSaved();
      toast.success(lang === "bn" ? "ইউজার তৈরি হয়েছে" : "User created");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shareMessage = (s: ShareInfo) =>
    lang === "bn"
      ? `আসসালামু আলাইকুম ${fullName || ""}\n\nTally Plus-এ আপনার লগইন তথ্য:\nফোন: ${s.phone}\nPIN: ${s.pin}\n\nএখানে লগইন করুন: ${s.loginUrl}`
      : `Hi ${fullName || ""},\n\nYour Tally Plus login:\nPhone: ${s.phone}\nPIN: ${s.pin}\n\nLog in here: ${s.loginUrl}`;

  const onCopy = async (s: ShareInfo) => {
    try {
      await navigator.clipboard.writeText(shareMessage(s));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(lang === "bn" ? "কপি হয়েছে" : "Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const onWhatsApp = (s: ShareInfo) => {
    const digits = s.phone.replace(/\D/g, "");
    const intl = digits.startsWith("0") ? "880" + digits.slice(1) : digits;
    const url = `https://wa.me/${intl}?text=${encodeURIComponent(shareMessage(s))}`;
    window.open(url, "_blank");
  };

  const onSms = (s: ShareInfo) => {
    const url = `sms:${s.phone}?body=${encodeURIComponent(shareMessage(s))}`;
    window.location.href = url;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-center text-base font-bold">New User Access</DialogTitle>
          </DialogHeader>

          <div className="max-h-[72vh] overflow-y-auto px-5 py-4">
            {share ? (
              <div className="grid gap-4">
                <div className="rounded-lg border bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="mb-2 font-bold">
                    {lang === "bn" ? "✅ ইউজার তৈরি হয়েছে" : "✅ User created"}
                  </div>
                  <div>
                    {lang === "bn"
                      ? "নিচের তথ্যগুলো কপি করে ইউজারকে পাঠান। এই PIN দিয়ে সে লগইন করতে পারবে।"
                      : "Share the credentials below. The user can log in with this PIN."}
                  </div>
                </div>

                <div className="grid gap-2 rounded-lg border p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{lang === "bn" ? "ফোন" : "Phone"}</span>
                    <span className="font-mono font-bold">{share.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PIN</span>
                    <span className="font-mono font-bold tracking-widest">{share.pin}</span>
                  </div>
                  <div className="break-all text-xs text-muted-foreground">{share.loginUrl}</div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={() => onCopy(share)} className="h-11">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-1 text-xs">{lang === "bn" ? "কপি" : "Copy"}</span>
                  </Button>
                  <Button
                    onClick={() => onWhatsApp(share)}
                    className="h-11 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="ml-1 text-xs">WhatsApp</span>
                  </Button>
                  <Button variant="outline" onClick={() => onSms(share)} className="h-11">
                    <Phone className="h-4 w-4" />
                    <span className="ml-1 text-xs">SMS</span>
                  </Button>
                </div>
              </div>
            ) : step === 1 ? (
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
                  <Label className="text-sm">
                    {lang === "bn" ? "৪ সংখ্যার লগইন PIN" : "4-digit login PIN"}{" "}
                    <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="● ● ● ●"
                    className="text-center text-xl tracking-[0.5em]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {lang === "bn"
                      ? "এই PIN দিয়ে কর্মচারী লগইন করবে — পরে শেয়ার করবেন"
                      : "Employee will log in with this PIN — share it after creating"}
                  </p>
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
            {share ? (
              <Button
                className="h-11 w-full bg-foreground text-background hover:bg-foreground/90"
                onClick={() => onOpenChange(false)}
              >
                {lang === "bn" ? "শেষ" : "Done"}
              </Button>
            ) : step === 1 ? (
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