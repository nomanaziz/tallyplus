import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Layers, X } from "lucide-react";
import { toast } from "sonner";
import { AdminSearchBar, matches } from "@/components/admin/AdminSearchBar";

type ValueRow = { code: string; label_en: string; label_bn?: string; hex?: string };
type Preset = {
  id: string;
  name_en: string;
  name_bn: string;
  attribute_type: string;
  values: ValueRow[];
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
};

const TYPES = ["size", "color", "weight", "volume", "flavor", "model", "custom"];

export default function AdminVariantPresetsPage() {
  const [items, setItems] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Preset> | null>(null);
  const [confirmDel, setConfirmDel] = useState<Preset | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("variant_attribute_presets")
      .select("*")
      .order("sort_order")
      .order("name_en");
    if (error) toast.error(error.message);
    setItems((data as Preset[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(
    () => items.filter((p) => matches(search, p.name_en, p.name_bn)),
    [items, search],
  );

  const updValue = (idx: number, patch: Partial<ValueRow>) => {
    const vs = [...(editing?.values ?? [])];
    vs[idx] = { ...vs[idx], ...patch };
    setEditing({ ...editing, values: vs });
  };
  const addValue = () => setEditing({ ...editing, values: [...(editing?.values ?? []), { code: "", label_en: "", label_bn: "" }] });
  const removeValue = (idx: number) => setEditing({ ...editing, values: (editing?.values ?? []).filter((_, i) => i !== idx) });

  const save = async () => {
    if (!editing?.name_en?.trim() || !editing?.name_bn?.trim()) return toast.error("নাম দিন");
    const values = (editing.values ?? []).filter((v) => v.code?.trim() && v.label_en?.trim());
    if (values.length === 0) return toast.error("অন্তত একটি value দিন");
    setSaving(true);
    const payload = {
      name_en: editing.name_en.trim(),
      name_bn: editing.name_bn.trim(),
      attribute_type: editing.attribute_type ?? "custom",
      values,
      is_active: editing.is_active ?? true,
      sort_order: editing.sort_order ?? 100,
    };
    const { error } = editing.id
      ? await supabase.from("variant_attribute_presets").update(payload).eq("id", editing.id)
      : await supabase.from("variant_attribute_presets").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  const del = async (p: Preset) => {
    const { error } = await supabase.from("variant_attribute_presets").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setConfirmDel(null);
    void load();
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Variant Presets</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Common variant types (Size, Color ইত্যাদি) — marketplace product-এ যুক্ত করার জন্য ready library।
          </p>
        </div>
        <Button onClick={() => setEditing({ attribute_type: "size", is_active: true, values: [{ code: "", label_en: "", label_bn: "" }] })}>
          <Plus className="mr-1 h-4 w-4" /> New Preset
        </Button>
      </div>

      <AdminSearchBar value={search} onChange={setSearch} count={filtered.length} placeholder="Preset খুঁজুন" />

      <Card>
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Layers className="h-10 w-10" />
              <p>No presets yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{p.name_en}</span>
                        <span className="text-xs text-muted-foreground">/ {p.name_bn}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">{p.attribute_type}</span>
                        {p.is_default && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">DEFAULT</span>}
                        {!p.is_active && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">INACTIVE</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.values.map((v) => (
                          <span key={v.code} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs">
                            {v.hex && <span className="inline-block h-3 w-3 rounded-full border" style={{ background: v.hex }} />}
                            {v.label_en}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDel(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Preset" : "New Preset"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Name (English)</Label><Input value={editing?.name_en ?? ""} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} placeholder="Diaper Size" /></div>
              <div><Label>Name (Bangla)</Label><Input value={editing?.name_bn ?? ""} onChange={(e) => setEditing({ ...editing, name_bn: e.target.value })} placeholder="ডায়াপার সাইজ" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={editing?.attribute_type ?? "custom"} onValueChange={(v) => setEditing({ ...editing, attribute_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Values</Label>
                <Button type="button" size="sm" variant="outline" onClick={addValue}><Plus className="mr-1 h-3 w-3" /> Add</Button>
              </div>
              <div className="space-y-2">
                {(editing?.values ?? []).map((v, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1">
                    <Input className="col-span-2" placeholder="code" value={v.code} onChange={(e) => updValue(i, { code: e.target.value })} />
                    <Input className="col-span-4" placeholder="Label EN" value={v.label_en} onChange={(e) => updValue(i, { label_en: e.target.value })} />
                    <Input className="col-span-3" placeholder="Label BN" value={v.label_bn ?? ""} onChange={(e) => updValue(i, { label_bn: e.target.value })} />
                    {editing?.attribute_type === "color" ? (
                      <Input className="col-span-2" type="color" value={v.hex ?? "#000000"} onChange={(e) => updValue(i, { hex: e.target.value })} />
                    ) : <div className="col-span-2" />}
                    <Button type="button" variant="ghost" size="sm" className="col-span-1" onClick={() => removeValue(i)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
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
            <AlertDialogTitle>Delete "{confirmDel?.name_en}"?</AlertDialogTitle>
            <AlertDialogDescription>এই preset টি delete হবে। যেসব marketplace product এই preset reference করছে তাদের variant data থাকবে — শুধু library থেকে preset মুছে যাবে।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => confirmDel && del(confirmDel)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}