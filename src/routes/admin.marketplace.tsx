import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Loader2, Package, Store } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/marketplace")({
  component: MarketplacePage,
});

type Product = {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  base_unit: string | null;
  is_active: boolean;
};

function MarketplacePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-sm text-muted-foreground">Canonical products & seller listings</p>
      </div>
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products"><Package className="mr-1 h-4 w-4" />Products</TabsTrigger>
          <TabsTrigger value="listings"><Store className="mr-1 h-4 w-4" />Listings</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="listings" className="mt-6">
          <ListingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function ProductsTab() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("marketplace_products").select("*").order("created_at", { ascending: false });
    setItems((data as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!editing?.name_bn || !editing?.name_en) return toast.error("নাম দিন");
    setSaving(true);
    const slug = editing.slug?.trim() || slugify(editing.name_en);
    const payload = {
      name_bn: editing.name_bn,
      name_en: editing.name_en,
      slug,
      description: editing.description ?? null,
      image_url: editing.image_url ?? null,
      category: editing.category ?? null,
      base_unit: editing.base_unit ?? "pcs",
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("marketplace_products").update(payload).eq("id", editing.id)
      : await supabase.from("marketplace_products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({ is_active: true, base_unit: "pcs" })}>
          <Plus className="mr-1 h-4 w-4" /> New Product
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="h-32 w-full rounded object-cover" />
                ) : (
                  <div className="h-32 w-full rounded bg-muted flex items-center justify-center">
                    <Package className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="mt-3 flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{p.name_bn}</div>
                    <div className="text-xs text-muted-foreground">{p.name_en}</div>
                  </div>
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Off"}</Badge>
                </div>
                {p.category && <div className="mt-1 text-xs text-muted-foreground">{p.category}</div>}
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setEditing(p)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">কোন product নেই</p>
          )}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>নাম (Bangla)</Label><Input value={editing?.name_bn ?? ""} onChange={(e) => setEditing({ ...editing, name_bn: e.target.value })} /></div>
              <div><Label>Name (English)</Label><Input value={editing?.name_en ?? ""} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} /></div>
            </div>
            <div><Label>Slug (auto if empty)</Label><Input value={editing?.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto-generated" /></div>
            <div><Label>Image URL</Label><Input value={editing?.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Input value={editing?.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
              <div><Label>Base Unit</Label><Input value={editing?.base_unit ?? ""} onChange={(e) => setEditing({ ...editing, base_unit: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={3} value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ListingsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("marketplace_listings")
        .select("*, marketplace_products(name_bn, name_en), shops(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  const togglePublish = async (l: any) => {
    const { error } = await supabase.from("marketplace_listings").update({ is_published: !l.is_published }).eq("id", l.id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_published: !x.is_published } : x)));
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (items.length === 0)
    return <Card><CardContent className="p-8 text-center text-muted-foreground">কোন listing নেই</CardContent></Card>;
  return (
    <div className="space-y-2">
      {items.map((l) => (
        <Card key={l.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{l.marketplace_products?.name_bn}</div>
              <div className="text-xs text-muted-foreground">
                {l.shops?.name} • ৳{l.price} • Stock: {l.stock}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={l.is_published ? "default" : "secondary"}>{l.is_published ? "Live" : "Hidden"}</Badge>
              <Button size="sm" variant="outline" onClick={() => togglePublish(l)}>
                {l.is_published ? "Unpublish" : "Publish"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
