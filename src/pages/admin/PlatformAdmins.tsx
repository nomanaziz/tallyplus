import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Loader2, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type AdminRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
};

function PlatformAdminsPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminRow | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name,phone,created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    setRows((profiles as AdminRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (name.trim().length < 2) return toast.error("নাম দিন");
    if (!/^\d{4}$/.test(pin)) return toast.error("৪ সংখ্যার PIN দিন");
    if (phone.replace(/\D/g, "").length < 10) return toast.error("সঠিক ফোন নম্বর দিন");
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-employee-user", {
        body: { phone, full_name: name.trim(), pin, overwrite_pin: true },
      });
      if (error || !data?.user_id) {
        throw new Error(error?.message ?? data?.error ?? "Failed");
      }
      const userId = data.user_id as string;
      const { error: roleErr } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      if (roleErr) throw roleErr;
      toast.success("Admin team member যোগ হয়েছে");
      setOpenAdd(false);
      setName(""); setPhone(""); setPin("");
      void load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", revokeTarget.id)
      .eq("role", "admin");
    if (error) return toast.error(error.message);
    toast.success("Admin role revoked");
    setRevokeTarget(null);
    void load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Admin Team</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Tally Plus platform admin team manage করুন
          </p>
        </div>
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add admin
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        কোনো admin নেই
                      </TableCell>
                    </TableRow>
                  ) : rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                      <TableCell>{r.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge className="gap-1"><ShieldCheck className="h-3 w-3" />Admin</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setRevokeTarget(r)}>
                          <ShieldOff className="mr-1 h-3.5 w-3.5" /> Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin team member যোগ করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>পূর্ণ নাম</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Md. Karim" />
            </div>
            <div>
              <Label>ফোন নম্বর</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <Label>৪-সংখ্যার PIN</Label>
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                এই PIN দিয়ে নতুন admin login করতে পারবে।
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Add admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Admin access revoke করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.full_name || "এই user"}-এর admin panel access বন্ধ হয়ে যাবে।
              User account থাকবে, শুধু admin role সরানো হবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revoke}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PlatformAdminsPage;
