import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

({
  component: BannersAdmin,
});

type Banner = {
  id: string;
  image_url: string;
  title_bn: string | null;
  title_en: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
};

function BannersAdmin() {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dashboard_banners")
      .select("*")
      .order("sort_order");
    if (error) toast.error(error.message);
    setItems((data as Banner[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const name = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("dashboard-banners").upload(name, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("dashboard-banners").getPublicUrl(name);
    setEditing((e) => ({ ...(e ?? {}), image_url: data.publicUrl }));
    setUploading(false);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.image_url) {
      toast.error("Banner image required");
      return;
    }
    setBusy(true);
    const payload = {
      image_url: editing.image_url,
      title_bn: editing.title_bn?.trim() || null,
      title_en: editing.title_en?.trim() || null,
      link_url: editing.link_url?.trim() || null,
      sort_order: editing.sort_order ?? 0,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("dashboard_banners").update(payload).eq("id", editing.id)
      : await supabase.from("dashboard_banners").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    const { error } = await supabase.from("dashboard_banners").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    void load();
  };

  const toggleActive = async (b: Banner) => {
    const { error } = await supabase
      .from("dashboard_banners")
      .update({ is_active: !b.is_active })
      .eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  return (
    <div className="container max-w-5xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard Banners</h1>
          <p className="text-sm text-muted-foreground">User dashboard-এ rotating banner manage করুন (২–৩ টি ব্যবহার করার সুপারিশ)।</p>
        </div>
        <Button onClick={() => setEditing({ is_active: true, sort_order: items.length })}>
          <Plus className="mr-1 h-4 w-4" /> Add Banner
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No banners yet. Add one to get started.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((b) => (
            <Card key={b.id} className={b.is_active ? "" : "opacity-60"}>
              <CardContent className="p-3">
                <img src={b.image_url} alt="" className="h-32 w-full rounded object-cover" />
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{b.title_bn || b.title_en || "(no title)"}</div>
                    <div className="truncate text-xs text-muted-foreground">{b.link_url || "no link"}</div>
                    <div className="text-xs text-muted-foreground">Sort: {b.sort_order}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Switch checked={b.is_active} onCheckedChange={() => void toggleActive(b)} />
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(b)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => void remove(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Banner Image</Label>
                {editing.image_url && (
                  <img src={editing.image_url} alt="" className="mt-1 h-28 w-full rounded border object-cover" />
                )}
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>{editing.image_url ? "Replace image" : "Upload image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(f);
                    }}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Title (Bangla)</Label>
                  <Input value={editing.title_bn ?? ""} onChange={(e) => setEditing({ ...editing, title_bn: e.target.value })} />
                </div>
                <div>
                  <Label>Title (English)</Label>
                  <Input value={editing.title_en ?? ""} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Link URL (optional)</Label>
                <Input
                  placeholder="/app/sell or https://..."
                  value={editing.link_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Switch
                    checked={editing.is_active ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy || uploading}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default BannersAdmin;
