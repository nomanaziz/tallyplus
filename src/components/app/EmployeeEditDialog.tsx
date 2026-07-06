import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export type EmployeeEditData = {
  id: string; // shop_members.id
  full_name: string | null;
  address: string | null;
  salary: number | null;
  nid: string | null;
  permanent_address: string | null;
  father_name: string | null;
  mother_name: string | null;
  emergency_phone: string | null;
  is_active?: boolean;
};

export function EmployeeEditDialog({
  open,
  onOpenChange,
  employee,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: EmployeeEditData | null;
  onSaved: () => void;
}) {
  const { lang, t } = useI18n();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [salary, setSalary] = useState("");
  const [nid, setNid] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && employee) {
      setName(employee.full_name ?? "");
      setAddress(employee.address ?? "");
      setSalary(employee.salary != null ? String(employee.salary) : "");
      setNid(employee.nid ?? "");
      setPermanentAddress(employee.permanent_address ?? "");
      setFatherName(employee.father_name ?? "");
      setMotherName(employee.mother_name ?? "");
      setEmergencyPhone(employee.emergency_phone ?? "");
      setIsActive(employee.is_active ?? true);
    }
  }, [open, employee]);

  const save = async () => {
    if (!employee) return;
    if (!name.trim()) {
      toast.error(t("p7_Name_required"));
      return;
    }
    setBusy(true);
    const payload = {
      full_name: name.trim(),
      address: address.trim() || null,
      salary: salary.trim() ? Number(salary) : null,
      nid: nid.trim() || null,
      permanent_address: permanentAddress.trim() || null,
      father_name: fatherName.trim() || null,
      mother_name: motherName.trim() || null,
      emergency_phone: emergencyPhone.trim() || null,
      is_active: isActive,
    };
    const { error } = await supabase
      .from("shop_members")
      .update(payload as never)
      .eq("id", employee.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("p7_Saved"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("p7_Edit_Employee")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t("p7_Full_name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("p7_Monthly_salary")}</Label>
              <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p7_NID_number")}</Label>
              <Input value={nid} onChange={(e) => setNid(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p7_Current_address")}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p7_Permanent_address")}</Label>
            <Input value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t("p7_Father_s_name")}</Label>
              <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("p7_Mother_s_name")}</Label>
              <Input value={motherName} onChange={(e) => setMotherName(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t("p7_Emergency_contact_phone")}</Label>
            <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-semibold">
                {lang === "bn" ? "সক্রিয় কর্মচারী" : "Active employee"}
              </div>
              <div className="text-xs text-muted-foreground">
                {lang === "bn"
                  ? "নিষ্ক্রিয় হলে তালিকায় লুকানো থাকবে ও SMS যাবে না।"
                  : "Inactive employees are hidden from lists and will not receive SMS."}
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("p7_Cancel")}
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "..." : t("p7_Save_2")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}