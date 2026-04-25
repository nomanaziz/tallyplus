import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/training")({
  component: TrainingAdmin,
});

type Video = {
  id: string;
  title_bn: string;
  title_en: string;
  youtube_id: string;
  category: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};

const CATEGORIES = [
  { value: "general", label: "General / সাধারণ" },
  { value: "sell", label: "Sell / বিক্রি" },
  { value: "purchase", label: "Purchase / কেনা" },
  { value: "stock", label: "Stock / স্টক" },
  { value: "expense", label: "Expense / খরচ" },
  { value: "contacts", label: "Contacts / যোগাযোগ" },
  { value: "online_shop", label: "Online Shop / অনলাইন শপ" },
  { value: "report", label: "Reports / রিপোর্ট" },
];

function extractYouTubeId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  // Match short or long youtube URLs, otherwise assume already an ID
  const m = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return trimmed;
}

function TrainingAdmin() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Video> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("training_videos")
      .select("*")
      .order("category")
      .order("sort_order");
    if (error) toast.error(error.message);
    setItems((data as Video[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!editing) return;
    const youtube_id = extractYouTubeId(editing.youtube_id ?? "");
    if (!editing.title_bn?.trim() && !editing.title_en?.trim()) {
      toast.error("Title required");
      return;
    }
    if (!youtube_id) { toast.error("YouTube URL/ID required"); return; }

    setBusy(true);
    const payload = {
      title_bn: editing.title_bn?.trim() ?? "",
      title_en: editing.title_en?.trim() ?? "",
      youtube_id,
      category: editing.category ?? "general",
      description: editing.description?.trim() || null,
      sort_order: Number(editing.sort_order ?? 0),
      is_published: editing.is_published ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("training_videos").update(payload).eq("id", editing.id)
      : await supabase.from("training_videos").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    const { error } = await supabase.from("training_videos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    void load();
  };

  return (
    <div className="container px-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Training Videos</h1>
          <p className="text-sm text-muted-foreground">Manage YouTube videos shown on the user's App Training page.</p>
        </div>
        <Button onClick={() => setEditing({ category: "general", is_published: true, sort_order: 0 })} className="gap-2">
          <Plus className="h-4 w-4" /> Add Video
        </Button>
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card className="mt-6"><CardContent className="py-10 text-center text-muted-foreground">
          No training videos yet. Click "Add Video" to add the first one.
        </CardContent></Card>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <div className="relative aspect-video bg-muted">
                <img
                  src={`https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`}
                  alt={v.title_bn || v.title_en}
                  className="h-full w-full object-cover"
                />
                {!v.is_published && (
                  <span className="absolute top-2 left-2 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Hidden
                  </span>
                )}
                <span className="absolute top-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  {v.category}
                </span>
              </div>
              <CardContent className="p-3">
                <div className="font-semibold">{v.title_bn || v.title_en}</div>
                {v.title_en && v.title_bn && (
                  <div className="text-xs text-muted-foreground">{v.title_en}</div>
                )}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(v)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => remove(v.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Video" : "Add Video"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Title (Bangla)</Label>
                <Input value={editing.title_bn ?? ""} onChange={(e) => setEditing({ ...editing, title_bn: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Title (English)</Label>
                <Input value={editing.title_en ?? ""} onChange={(e) => setEditing({ ...editing, title_en: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>YouTube URL or Video ID</Label>
                <Input
                  placeholder="https://youtube.com/watch?v=... or ID"
                  value={editing.youtube_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, youtube_id: e.target.value })}
                />
                {editing.youtube_id && extractYouTubeId(editing.youtube_id) && (
                  <img
                    src={`https://img.youtube.com/vi/${extractYouTubeId(editing.youtube_id)}/hqdefault.jpg`}
                    alt=""
                    className="mt-1 aspect-video w-full rounded border object-cover"
                  />
                )}
              </div>
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select value={editing.category ?? "general"} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Description (optional)</Label>
                <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} />
              </div>
              <div className="flex items-center gap-4">
                <div className="grid gap-1.5">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    className="w-24"
                    value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={editing.is_published ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, is_published: v })}
                  />
                  <Label>Published</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? "..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
