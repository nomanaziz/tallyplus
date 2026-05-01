import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Loader2, ShieldOff, ShieldCheck, Crown, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_PERMISSION_KEYS, ADMIN_PERMISSION_LABELS, type AdminPermKey } from "@/lib/admin-perms";

type AdminRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_super: boolean;
  permissions: Record<string, boolean> | null;
  created_at: string;
};

const emptyPerms = (): Record<AdminPermKey, boolean> => {
  const o = {} as Record<AdminPermKey, boolean>;
  ADMIN_PERMISSION_KEYS.forEach((k) => (o[k] = false));
  return o;
};

function PermsCheckboxes({
  value,
  onChange,
}: {
  value: Record<AdminPermKey, boolean>;
  onChange: (next: Record<AdminPermKey, boolean>) => void;
}) {
  return (
    <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
      {ADMIN_PERMISSION_KEYS.map((k) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!value[k]}
            onCheckedChange={(c) => onChange({ ...value, [k]: c === true })}
          />
          <span>{ADMIN_PERMISSION_LABELS[k]}</span>
        </label>
      ))}
    </div>
  );
}

function PlatformAdminsPage() {
  const { isSuperAdmin, user } = useAuth();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<Record<AdminPermKey, boolean>>(emptyPerms());
  const [saving, setSaving] = useState(false);

  // Edit perms dialog
  const [editTarget, setEditTarget] = useState<AdminRow | null>(null);
  const [editPerms, setEditPerms] = useState<Record<AdminPermKey, boolean>>(emptyPerms());

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<AdminRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("user_id,email,full_name,is_super,permissions,created_at")
      .order("is_super", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data as AdminRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const submit = async () => {
    if (name.trim().length < 2) return toast.error("নাম দিন");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error("সঠিক email দিন");
    if (password.length < 6) return toast.error("Password কমপক্ষে ৬ অক্ষর");
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin-user", {
        body: { email: email.trim(), password, full_name: name.trim(), permissions: perms },
      });
      if (error || !data?.ok) {
        throw new Error(error?.message ?? data?.error ?? "Failed");
      }
      toast.success("Admin team member যোগ হয়েছে");
      setOpenAdd(false);
      setName(""); setEmail(""); setPassword(""); setPerms(emptyPerms());
      void load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (r: AdminRow) => {
    const merged = emptyPerms();
    if (r.permissions) {
      ADMIN_PERMISSION_KEYS.forEach((k) => {
        merged[k] = !!r.permissions?.[k];
      });
    }
    setEditPerms(merged);
    setEditTarget(r);
  };

  const savePerms = async () => {
    if (!editTarget) return;
    const { error } = await supabase
      .from("admin_profiles")
      .update({ permissions: editPerms })
      .eq("user_id", editTarget.user_id);
    if (error) return toast.error(error.message);
    toast.success("Permissions update হয়েছে");
    setEditTarget(null);
    void load();
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    if (revokeTarget.is_super) {
      toast.error("Super admin কে revoke করা যাবে না");
      setRevokeTarget(null);
      return;
    }
    const { error: roleErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", revokeTarget.user_id)
      .eq("role", "admin");
    if (roleErr) return toast.error(roleErr.message);
    await supabase.from("admin_profiles").delete().eq("user_id", revokeTarget.user_id);
    toast.success("Admin role revoke হয়েছে");
    setRevokeTarget(null);
    void load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Admin Team</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Tally Plus platform admin দের email + password দিয়ে login। প্রতিটার আলাদা permission set করা যায়।
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setOpenAdd(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add admin
          </Button>
        )}
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
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Permissions</TableHead>
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
                  ) : rows.map((r) => {
                    const isMe = r.user_id === user?.id;
                    const permCount = r.permissions
                      ? ADMIN_PERMISSION_KEYS.filter((k) => r.permissions?.[k]).length
                      : 0;
                    return (
                      <TableRow key={r.user_id}>
                        <TableCell className="font-medium">
                          {r.full_name || "—"}
                          {isMe && <span className="ml-2 text-xs text-muted-foreground">(আপনি)</span>}
                        </TableCell>
                        <TableCell className="text-sm">{r.email || <span className="text-muted-foreground">— set হয়নি</span>}</TableCell>
                        <TableCell>
                          {r.is_super ? (
                            <Badge className="gap-1 bg-amber-500 hover:bg-amber-500"><Crown className="h-3 w-3" />Super</Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" />Admin</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.is_super ? "সব access" : `${permCount} / ${ADMIN_PERMISSION_KEYS.length}`}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {isSuperAdmin && !r.is_super && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                                <Settings2 className="mr-1 h-3.5 w-3.5" /> Permissions
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setRevokeTarget(r)}>
                                <ShieldOff className="mr-1 h-3.5 w-3.5" /> Revoke
                              </Button>
                            </>
                          )}
                          {r.is_super && (
                            <span className="text-xs text-muted-foreground">Protected</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add admin */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>নতুন admin team member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>পূর্ণ নাম</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Md. Karim" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
            </div>
            <div>
              <Label>Password (কমপক্ষে ৬ অক্ষর)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <Label>Page permissions</Label>
              <PermsCheckboxes value={perms} onChange={setPerms} />
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

      {/* Edit perms */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Permissions — {editTarget?.full_name || editTarget?.email}</DialogTitle>
          </DialogHeader>
          <PermsCheckboxes value={editPerms} onChange={setEditPerms} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={savePerms}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Admin access revoke করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.full_name || revokeTarget?.email}-এর admin panel access বন্ধ হয়ে যাবে।
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
