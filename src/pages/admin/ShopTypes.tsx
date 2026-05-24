import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminSearchBar, matches } from "@/components/admin/AdminSearchBar";



type ShopType = {
  id: string;
  code: string;
  name_bn: string;
  name_en: string;
  icon: string | null;
  default_categories: string[];
  sort_order: number;
  is_active: boolean;
  is_group_head?: boolean;
  category_group?: string | null;
  includes_bn?: string | null;
  includes_en?: string | null;
};

function ShopTypesAdmin() {
  const [items, setItems] = useState<ShopType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ShopType> | null>(null);
  const [catText, setCatText] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => items.filter((s) => matches(search, s.code, s.name_bn, s.name_en)),
    [items, search],
  );

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("shop_types").select("*").order("sort_order");
    setItems((data as ShopType[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const openEditor = (s: Partial<ShopType> | null) => {
    setEditing(s ?? { is_active: true, sort_order: items.length + 1 });
    setCatText((s?.default_categories ?? []).join(", "));
  };

  const save = async () => {
    if (!editing?.code || !editing?.name_bn || !editing?.name_en) {
      return toast.error("Code, name (bn) ও name (en) দিন");
    }
    setSaving(true);
    const cats = catText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const payload = {
      code: editing.code.trim().toLowerCase(),
      name_bn: editing.name_bn.trim(),
      name_en: editing.name_en.trim(),
      icon: editing.icon ?? null,
      default_categories: cats,
      sort_order: Number(editing.sort_order) || 0,
      is_active: editing.is_active ?? true,
      is_group_head: editing.is_group_head ?? false,
      category_group: editing.category_group?.trim() || null,
      includes_bn: editing.includes_bn?.trim() || null,
      includes_en: editing.includes_en?.trim() || null,
    };
    const { error } = editing.id
      ? await supabase.from("shop_types").update(payload).eq("id", editing.id)
      : await supabase.from("shop_types").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shop Types</h1>
          <p className="text-sm text-muted-foreground">দোকানের ধরন manage করুন</p>
        </div>
        <Button onClick={() => openEditor(null)}>
          <Plus className="mr-1 h-4 w-4" /> New Type
        </Button>
      </div>

      <AdminSearchBar value={search} onChange={setSearch} count={filtered.length} placeholder="Code বা name দিয়ে খুঁজুন" />

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{s.name_bn}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.name_en} • <code>{s.code}</code>
                    </div>
                  </div>
                  <Badge variant={s.is_active ? "default" : "secondary"}>
                    {s.is_active ? "Active" : "Off"}
                  </Badge>
                </div>
                {s.default_categories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.default_categories.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-3" onClick={() => openEditor(s)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Shop Type" : "New Shop Type"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Code (lowercase, no space)</Label>
              <Input
                value={editing?.code ?? ""}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                placeholder="pharmacy, grocery..."
                disabled={!!editing?.id}
              />
            </div>
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
            <div>
              <Label>Icon (lucide name or emoji)</Label>
              <Input value={editing?.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="Pill, Store, 🏪" />
            </div>
            <div>
              <Label>Default categories (comma-separated)</Label>
              <Textarea
                rows={2}
                value={catText}
                onChange={(e) => setCatText(e.target.value)}
                placeholder="ওষুধ, বেবি কেয়ার, প্রসাধনী"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={editing?.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ShopTypesAdmin;
