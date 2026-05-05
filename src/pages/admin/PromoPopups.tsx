import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminSearchBar, matches } from "@/components/admin/AdminSearchBar";

type Popup = {
  id: string;
  title_bn: string | null; title_en: string | null;
  body_bn: string | null; body_en: string | null;
  image_url: string | null;
  cta_text_bn: string | null; cta_text_en: string | null; cta_link: string | null;
  is_active: boolean;
  starts_at: string | null; ends_at: string | null;
};

export default function AdminPromoPopups() {
  const [items, setItems] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Popup> | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () => items.filter((p) => matches(search, p.title_bn, p.title_en, p.body_bn, p.body_en, p.cta_link)),
    [items, search],
  );

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} popup(s)?`)) return;
    const ids = [...selected];
    const { error } = await supabase.from("promo_popups").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} deleted`);
    setSelected(new Set());
    void load();
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("promo_popups").select("*").order("created_at", { ascending: false });
    setItems((data as Popup[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const name = `promo-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("dashboard-banners").upload(name, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("dashboard-banners").getPublicUrl(name);
    setEditing((e) => ({ ...(e ?? {}), image_url: data.publicUrl }));
    setUploading(false);
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    const payload: any = {
      title_bn: editing.title_bn ?? null, title_en: editing.title_en ?? null,
      body_bn: editing.body_bn ?? null, body_en: editing.body_en ?? null,
      image_url: editing.image_url ?? null,
      cta_text_bn: editing.cta_text_bn ?? null, cta_text_en: editing.cta_text_en ?? null,
      cta_link: editing.cta_link ?? null,
      is_active: editing.is_active ?? true,
      starts_at: editing.starts_at || null,
      ends_at: editing.ends_at || null,
    };
    const { error } = editing.id
      ? await supabase.from("promo_popups").update(payload).eq("id", editing.id)
      : await supabase.from("promo_popups").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("promo_popups").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promo Popups</h1>
          <p className="text-sm text-muted-foreground">দোকানদার login করলে যে popup দেখবে</p>
        </div>
        <Button onClick={() => setEditing({ is_active: true })}><Plus className="mr-1 h-4 w-4" />New</Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdminSearchBar value={search} onChange={setSearch} count={filtered.length} placeholder="Title, body, CTA" />
        {selected.size > 0 && (
          <Button size="sm" variant="destructive" onClick={() => void bulkDelete()}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete {selected.size}
          </Button>
        )}
      </div>

      {loading ? <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                </div>
                {p.image_url && <img src={p.image_url} alt="" className="mb-3 h-32 w-full rounded object-cover" />}
                <div className="font-semibold">{p.title_bn || p.title_en || "(untitled)"}</div>
                <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.body_bn || p.body_en}</div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
                  <span className={"ml-auto rounded-full px-2 py-0.5 text-xs " + (p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted")}>{p.is_active ? "Active" : "Off"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">{search ? "কোনো ফলাফল নেই" : "কোনো popup নেই"}</p>}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Popup</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Image</Label>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {editing?.image_url && <img src={editing.image_url} alt="" className="mt-2 h-32 rounded" />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title (BN)</Label><Input value={editing?.title_bn ?? ""} onChange={(e) => setEditing({ ...editing, title_bn: e.target.value })} /></div>
              <div><Label>Title (EN)</Label><Input value={editing?.title_en ?? ""} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Body (BN)</Label><Textarea value={editing?.body_bn ?? ""} onChange={(e) => setEditing({ ...editing, body_bn: e.target.value })} /></div>
              <div><Label>Body (EN)</Label><Textarea value={editing?.body_en ?? ""} onChange={(e) => setEditing({ ...editing, body_en: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CTA Text (BN)</Label><Input value={editing?.cta_text_bn ?? ""} onChange={(e) => setEditing({ ...editing, cta_text_bn: e.target.value })} /></div>
              <div><Label>CTA Text (EN)</Label><Input value={editing?.cta_text_en ?? ""} onChange={(e) => setEditing({ ...editing, cta_text_en: e.target.value })} /></div>
            </div>
            <div><Label>CTA Link</Label><Input value={editing?.cta_link ?? ""} onChange={(e) => setEditing({ ...editing, cta_link: e.target.value })} placeholder="/app/subscribe" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Starts At</Label><Input type="datetime-local" value={editing?.starts_at?.slice(0,16) ?? ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} /></div>
              <div><Label>Ends At</Label><Input type="datetime-local" value={editing?.ends_at?.slice(0,16) ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
