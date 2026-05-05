import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { AdminSearchBar, matches } from "@/components/admin/AdminSearchBar";

type Brand = {
  id: string;
  name: string;
  name_bn: string | null;
  shop_id: string | null;
  is_global: boolean;
};

export default function AdminBrandsPage() {
  const [items, setItems] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const [confirmDel, setConfirmDel] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_brands")
      .select("id,name,name_bn,shop_id,is_global")
      .is("shop_id", null)
      .order("name");
    if (error) toast.error(error.message);
    setItems((data as Brand[]) ?? []);
    setLoading(false);
    setSelected(new Set());
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(
    () => items.filter((b) => matches(search, b.name, b.name_bn ?? "")),
    [items, search],
  );

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error("Name দিন"); return; }
    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      name_bn: editing.name_bn?.trim() || null,
      is_global: true,
      shop_id: null,
    };
    const { error } = editing.id
      ? await supabase.from("product_brands").update(payload).eq("id", editing.id)
      : await supabase.from("product_brands").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  const del = async (b: Brand) => {
    const { error } = await supabase.from("product_brands").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setConfirmDel(null);
    void load();
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("product_brands").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} টি ব্র্যান্ড মুছে ফেলা হয়েছে`);
    void load();
  };

  const toggle = (id: string) => {
    setSelected((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Brands / Companies</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Default global brands যা সব seller-এর product form-এ suggest হবে।
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete ({selected.size})
            </Button>
          )}
          <Button onClick={() => setEditing({ is_global: true })}>
            <Plus className="mr-1 h-4 w-4" /> New Brand
          </Button>
        </div>
      </div>

      <AdminSearchBar value={search} onChange={setSearch} count={filtered.length} placeholder="ব্র্যান্ডের নাম দিয়ে খুঁজুন" />

      <Card>
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Tag className="h-10 w-10" />
              <p>No brands yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded border px-3 py-2">
                  <Checkbox checked={selected.has(b.id)} onCheckedChange={() => toggle(b.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{b.name}{b.name_bn ? <span className="text-xs text-muted-foreground"> / {b.name_bn}</span> : null}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDel(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit brand" : "New brand"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name (English)</Label>
              <Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Square, ACI, Pran" />
            </div>
            <div>
              <Label>Name (Bangla, optional)</Label>
              <Input value={editing?.name_bn ?? ""} onChange={(e) => setEditing({ ...editing, name_bn: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirmDel?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>এই ব্র্যান্ডটি মুছে ফেলা হবে।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDel && del(confirmDel)}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}