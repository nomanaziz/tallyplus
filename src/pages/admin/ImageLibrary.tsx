import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Copy, ExternalLink, Image as ImageIcon, RefreshCw, Search, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ImageItem = {
  url: string;
  name: string;
  path?: string;
  source: "storage" | "external";
  createdAt?: string | null;
  sizeKb?: number | null;
  usedBy: { kind: "product" | "variant"; id: string; label: string }[];
};

const BUCKET = "product-images";
const FOLDER = "marketplace";

export default function AdminImageLibraryPage() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "used" | "unused" | "external">("all");
  const [preview, setPreview] = useState<ImageItem | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [storageRes, prodRes, varRes] = await Promise.all([
        supabase.storage.from(BUCKET).list(FOLDER, {
          limit: 1000,
          sortBy: { column: "created_at", order: "desc" },
        }),
        supabase.from("marketplace_products").select("id,name_bn,name_en,image_url").not("image_url", "is", null),
        supabase.from("marketplace_product_variants").select("id,variant_label_bn,variant_label_en,image_url,marketplace_product_id").not("image_url", "is", null),
      ]);

      // Build usage map
      const usage = new Map<string, ImageItem["usedBy"]>();
      const push = (url: string, item: { kind: "product" | "variant"; id: string; label: string }) => {
        const list = usage.get(url) ?? [];
        list.push(item);
        usage.set(url, list);
      };
      type ProdRow = { id: string; name_bn: string; name_en: string; image_url: string | null };
      type VarRow = { id: string; variant_label_bn: string | null; variant_label_en: string; image_url: string | null };
      ((prodRes.data as ProdRow[] | null) ?? []).forEach((p) => {
        if (p.image_url) push(p.image_url, { kind: "product", id: p.id, label: p.name_bn || p.name_en });
      });
      ((varRes.data as VarRow[] | null) ?? []).forEach((v) => {
        if (v.image_url) push(v.image_url, { kind: "variant", id: v.id, label: v.variant_label_bn ?? v.variant_label_en });
      });

      // Storage files
      const storageItems: ImageItem[] = ((storageRes.data ?? []) as Array<{ name: string; created_at?: string; metadata?: { size?: number } }>).
        filter((f) => f.name && !f.name.startsWith(".")).
        map((f) => {
          const path = `${FOLDER}/${f.name}`;
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
          const url = data.publicUrl;
          return {
            url,
            name: f.name,
            path,
            source: "storage",
            createdAt: f.created_at ?? null,
            sizeKb: f.metadata?.size ? Math.round(f.metadata.size / 1024) : null,
            usedBy: usage.get(url) ?? [],
          };
        });

      // External URLs (in DB but not in storage)
      const known = new Set(storageItems.map((i) => i.url));
      const externalItems: ImageItem[] = [];
      for (const [url, used] of usage.entries()) {
        if (!known.has(url)) {
          externalItems.push({
            url,
            name: url.split("/").pop()?.split("?")[0] ?? url,
            source: "external",
            usedBy: used,
          });
        }
      }

      setItems([...storageItems, ...externalItems]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const [uploading, setUploading] = useState(false);
  const [confirmDel, setConfirmDel] = useState<ImageItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0, fail = 0;
    for (const file of Array.from(files)) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${FOLDER}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (error) { fail++; toast.error(`${file.name}: ${error.message}`); }
      else ok++;
    }
    setUploading(false);
    if (ok > 0) toast.success(`${ok} টি image upload হয়েছে`);
    if (fail === 0) await load();
    else await load();
  };

  const doDelete = async () => {
    if (!confirmDel || !confirmDel.path) return;
    setDeleting(true);
    const { error } = await supabase.storage.from(BUCKET).remove([confirmDel.path]);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Image deleted");
    setConfirmDel(null);
    setPreview(null);
    await load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "used" && i.usedBy.length === 0) return false;
      if (filter === "unused" && i.usedBy.length > 0) return false;
      if (filter === "external" && i.source !== "external") return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.url.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, filter]);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const counts = useMemo(() => ({
    all: items.length,
    used: items.filter((i) => i.usedBy.length > 0).length,
    unused: items.filter((i) => i.usedBy.length === 0).length,
    external: items.filter((i) => i.source === "external").length,
  }), [items]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Image Library</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Marketplace product image সব এক জায়গায় — copy URL করে অন্য product-এ reuse করুন।
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>{uploading ? "Uploading…" : "Upload images"}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => { void uploadFiles(e.target.files); e.currentTarget.value = ""; }}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filename বা URL খুঁজুন"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["all", "used", "unused", "external"] as const).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={filter === k ? "default" : "outline"}
              onClick={() => setFilter(k)}
              className="text-xs"
            >
              {k === "all" ? "সব" : k === "used" ? "ব্যবহৃত" : k === "unused" ? "অব্যবহৃত" : "External"} ({counts[k]})
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
              <p>কোনো image নেই</p>
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {filtered.map((it) => (
                  <div key={it.url} className="group overflow-hidden rounded-lg border bg-card transition hover:shadow-md">
                    <button
                      type="button"
                      onClick={() => setPreview(it)}
                      className="relative block aspect-square w-full overflow-hidden bg-muted"
                    >
                      <img src={it.url} alt={it.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                      {it.source === "external" && (
                        <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">External</span>
                      )}
                      {it.usedBy.length > 0 ? (
                        <span className="absolute right-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{it.usedBy.length}</span>
                      ) : (
                        <span className="absolute right-1 top-1 rounded-full bg-muted-foreground/70 px-1.5 py-0.5 text-[10px] font-semibold text-background">unused</span>
                      )}
                    </button>
                    <div className="flex items-center gap-1 p-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{it.name}</div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[400px] break-all"><p className="text-xs">{it.url}</p></TooltipContent>
                      </Tooltip>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(it.url)} title="Copy URL">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <a href={it.url} target="_blank" rel="noreferrer" className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent" title="Open">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Image Details</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border bg-muted">
                <img src={preview.url} alt={preview.name} className="mx-auto max-h-[50vh] object-contain" />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-muted-foreground">URL</div>
                <div className="flex gap-2">
                  <Input readOnly value={preview.url} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <Button onClick={() => copy(preview.url)} size="sm"><Copy className="mr-1 h-3.5 w-3.5" />Copy</Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-muted-foreground">Source:</span> {preview.source}</div>
                {preview.sizeKb != null && <div><span className="text-muted-foreground">Size:</span> {preview.sizeKb} KB</div>}
                {preview.createdAt && <div><span className="text-muted-foreground">Created:</span> {new Date(preview.createdAt).toLocaleDateString()}</div>}
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">ব্যবহৃত হচ্ছে ({preview.usedBy.length})</div>
                {preview.usedBy.length === 0 ? (
                  <p className="text-xs text-muted-foreground">কোনো product/variant এই image ব্যবহার করছে না।</p>
                ) : (
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded border p-2 text-xs">
                    {preview.usedBy.map((u, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="truncate">{u.label}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{u.kind}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}