import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ChevronRight, Loader2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { AdminSearchBar, matches } from "@/components/admin/AdminSearchBar";

type Cat = {
  id: string;
  parent_id: string | null;
  name_bn: string;
  name_en: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
}

export default function MarketplaceCategoriesPage() {
  const [items, setItems] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);
  const [parentForNew, setParentForNew] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<Cat | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_categories")
      .select("id,parent_id,name_bn,name_en,slug,sort_order,is_active")
      .order("sort_order")
      .order("name_en");
    if (error) toast.error(error.message);
    setItems((data as Cat[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    if (!search.trim()) return items;
    const matched = items.filter((c) => matches(search, c.name_bn, c.name_en, c.slug));
    // Include parents of matched children so the tree still renders
    const set = new Set(matched.map((c) => c.id));
    matched.forEach((c) => { if (c.parent_id) set.add(c.parent_id); });
    return items.filter((c) => set.has(c.id));
  }, [items, search]);
  const roots = visible.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => visible.filter((c) => c.parent_id === id);

  const save = async () => {
    if (!editing?.name_bn || !editing?.name_en) {
      toast.error("নাম দিন");
      return;
    }
    setSaving(true);
    const slug = (editing.slug?.trim() || slugify(editing.name_en)).toLowerCase();
    const payload = {
      parent_id: editing.parent_id ?? parentForNew ?? null,
      name_bn: editing.name_bn.trim(),
      name_en: editing.name_en.trim(),
      slug,
      sort_order: editing.sort_order ?? 0,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("marketplace_categories").update(payload).eq("id", editing.id)
      : await supabase.from("marketplace_categories").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    setParentForNew(null);
    void load();
  };

  const del = async (c: Cat) => {
    const { error } = await supabase.from("marketplace_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setConfirmDel(null);
    void load();
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Marketplace Categories</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Category-এর under subcategory যোগ করুন। Customer এগুলো filter হিসেবে দেখবে।
          </p>
        </div>
        <Button onClick={() => { setParentForNew(null); setEditing({ is_active: true, sort_order: 0 }); }}>
          <Plus className="mr-1 h-4 w-4" /> New Category
        </Button>
      </div>

      <AdminSearchBar value={search} onChange={setSearch} count={visible.length} placeholder="Name বা slug দিয়ে খুঁজুন" />

      <Card>
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : roots.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <FolderTree className="h-10 w-10" />
              <p>No categories yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {roots.map((root) => (
                <CategoryNode
                  key={root.id}
                  cat={root}
                  children={childrenOf(root.id)}
                  onEdit={(c) => { setParentForNew(null); setEditing(c); }}
                  onAddChild={(parentId) => { setParentForNew(parentId); setEditing({ is_active: true, sort_order: 0, parent_id: parentId }); }}
                  onDelete={(c) => setConfirmDel(c)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && (setEditing(null), setParentForNew(null))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit category" : (parentForNew ? "Add subcategory" : "New category")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name (Bangla)</Label>
                <Input value={editing?.name_bn ?? ""} onChange={(e) => setEditing({ ...editing, name_bn: e.target.value })} />
              </div>
              <div>
                <Label>Name (English)</Label>
                <Input value={editing?.name_en ?? ""} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Slug (auto if empty)</Label>
                <Input value={editing?.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={editing?.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setParentForNew(null); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirmDel?.name_en}"?</AlertDialogTitle>
            <AlertDialogDescription>
              এর সকল subcategory এবং product link মুছে যাবে।
            </AlertDialogDescription>
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

function CategoryNode({
  cat, children, onEdit, onAddChild, onDelete,
}: {
  cat: Cat;
  children: Cat[];
  onEdit: (c: Cat) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (c: Cat) => void;
}) {
  return (
    <div className="rounded border">
      <div className="flex items-center gap-2 px-3 py-2">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{cat.name_bn} <span className="text-xs text-muted-foreground">/ {cat.name_en}</span></div>
          <div className="text-[11px] text-muted-foreground truncate">slug: {cat.slug}{!cat.is_active && " · inactive"}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onAddChild(cat.id)}><Plus className="h-3.5 w-3.5" /> Sub</Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(cat)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      {children.length > 0 && (
        <div className="space-y-1 border-t bg-muted/30 px-3 py-2 pl-8">
          {children.map((sub) => (
            <div key={sub.id} className="flex items-center gap-2 rounded bg-background px-2 py-1.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm">{sub.name_bn} <span className="text-xs text-muted-foreground">/ {sub.name_en}</span></div>
                <div className="text-[11px] text-muted-foreground truncate">slug: {sub.slug}{!sub.is_active && " · inactive"}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit(sub)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(sub)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
