import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Loader2, Package, Store, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Search, MoreHorizontal, Check, FolderOpen, Upload } from "lucide-react";
import { toast } from "sonner";



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
  brand?: string | null;
  pack_size?: string | null;
  barcode?: string | null;
  default_price?: number | null;
  default_cost?: number | null;
  shop_types?: string[];
  created_at?: string;
  category_id?: string | null;
  subcategory_id?: string | null;
};

type ShopTypeOpt = { code: string; name_bn: string; name_en: string };
type MpCat = { id: string; parent_id: string | null; name_bn: string; name_en: string; is_active: boolean };

function MarketplacePage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Marketplace</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Canonical products & seller listings</p>
      </div>
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products"><Package className="mr-1 h-4 w-4" />Products</TabsTrigger>
          <TabsTrigger value="listings"><Store className="mr-1 h-4 w-4" />Listings</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="listings" className="mt-4">
          <ListingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 60);
}

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function ProductsTab() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [shopTypes, setShopTypes] = useState<ShopTypeOpt[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [mpCats, setMpCats] = useState<MpCat[]>([]);

  // filters
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);
  const [category, setCategory] = useState<string>("__all");
  const [shopTypeFilter, setShopTypeFilter] = useState<string>("__all");
  const [activeFilter, setActiveFilter] = useState<string>("__all");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string | null>(null);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("marketplace_products")
      .select("category")
      .not("category", "is", null)
      .limit(5000);
    const map = new Map<string, number>();
    (data ?? []).forEach((r: any) => {
      const c = (r.category ?? "").trim();
      if (!c) return;
      map.set(c, (map.get(c) ?? 0) + 1);
    });
    const arr = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setCategories(arr);
  };

  const load = async () => {
    setLoading(true);
    let q = supabase.from("marketplace_products").select("*", { count: "exact" });
    if (debouncedSearch.trim()) {
      const s = `%${debouncedSearch.trim()}%`;
      q = q.or(`name_bn.ilike.${s},name_en.ilike.${s},brand.ilike.${s},barcode.ilike.${s}`);
    }
    if (category !== "__all") {
      if (category === "__none") q = q.is("category", null);
      else q = q.eq("category", category);
    }
    if (shopTypeFilter !== "__all") q = q.contains("shop_types", [shopTypeFilter]);
    if (activeFilter !== "__all") q = q.eq("is_active", activeFilter === "active");
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    q = q.order("category", { ascending: true, nullsFirst: false }).order("name_en", { ascending: true }).range(from, to);
    const { data, count, error } = await q;
    if (error) toast.error(error.message);
    setItems((data as Product[]) ?? []);
    setTotal(count ?? 0);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    void loadCategories();
    (async () => {
      const { data } = await supabase
        .from("shop_types")
        .select("code,name_bn,name_en")
        .eq("is_active", true)
        .order("sort_order");
      setShopTypes((data as ShopTypeOpt[]) ?? []);
      const { data: cats } = await supabase
        .from("marketplace_categories")
        .select("id,parent_id,name_bn,name_en,is_active")
        .eq("is_active", true)
        .order("sort_order");
      setMpCats((cats as MpCat[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, shopTypeFilter, activeFilter, page, pageSize]);

  // reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, shopTypeFilter, activeFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
      category: (editing.category ?? "").trim() || null,
      base_unit: editing.base_unit ?? "pcs",
      is_active: editing.is_active ?? true,
      brand: editing.brand ?? null,
      pack_size: editing.pack_size ?? null,
      barcode: editing.barcode ?? null,
      default_price: Number(editing.default_price) || 0,
      default_cost: Number(editing.default_cost) || 0,
      shop_types: editing.shop_types ?? [],
      category_id: editing.category_id ?? null,
      subcategory_id: editing.subcategory_id ?? null,
    };
    const { error } = editing.id
      ? await supabase.from("marketplace_products").update(payload).eq("id", editing.id)
      : await supabase.from("marketplace_products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    void load();
    void loadCategories();
  };

  const toggleShopType = (code: string) => {
    const cur = editing?.shop_types ?? [];
    const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
    setEditing({ ...editing, shop_types: next });
  };

  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `marketplace/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type || undefined,
    });
    if (error) {
      setUploadingImage(false);
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setEditing((prev) => ({ ...(prev ?? {}), image_url: data.publicUrl }));
    setUploadingImage(false);
    toast.success("Image uploaded");
  };

  const toggleAllOnPage = (checked: boolean) => {
    if (checked) setSelected(new Set(items.map((i) => i.id)));
    else setSelected(new Set());
  };
  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const bulkSetActive = async (active: boolean) => {
    if (selected.size === 0) return;
    const { error } = await supabase.from("marketplace_products").update({ is_active: active }).in("id", Array.from(selected));
    if (error) return toast.error(error.message);
    toast.success(`${selected.size} updated`);
    void load();
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const { error } = await supabase.from("marketplace_products").delete().in("id", Array.from(selected));
    if (error) return toast.error(error.message);
    toast.success(`${selected.size} deleted`);
    setConfirmDelete(false);
    void load();
    void loadCategories();
  };
  const bulkAssignCategory = async (cat: string) => {
    if (selected.size === 0) return;
    const value = cat.trim() || null;
    const { error } = await supabase.from("marketplace_products").update({ category: value }).in("id", Array.from(selected));
    if (error) return toast.error(error.message);
    toast.success(`${selected.size} moved`);
    setBulkCategory(null);
    void load();
    void loadCategories();
  };

  const allOnPageSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const someOnPageSelected = items.some((i) => selected.has(i.id));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
      {/* Categories sidebar */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardContent className="p-3">
            <div className="mb-2 flex items-center gap-2 px-2 text-sm font-semibold">
              <FolderOpen className="h-4 w-4" /> Categories
            </div>
            <div className="max-h-[70vh] space-y-0.5 overflow-y-auto">
              <CategoryRow label="All categories" count={total} active={category === "__all"} onClick={() => setCategory("__all")} />
              <CategoryRow label="(Uncategorized)" count={categories.length === 0 ? 0 : undefined} active={category === "__none"} onClick={() => setCategory("__none")} muted />
              {categories.map((c) => (
                <CategoryRow key={c.name} label={c.name} count={c.count} active={category === c.name} onClick={() => setCategory(c.name)} />
              ))}
              {categories.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">No categories yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Main */}
      <div className="min-w-0 space-y-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name, brand, barcode…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={shopTypeFilter} onValueChange={setShopTypeFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Shop type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All shop types</SelectItem>
              {shopTypes.map((s) => <SelectItem key={s.code} value={s.code}>{s.name_bn}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All status</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            {selected.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Bulk ({selected.size}) <MoreHorizontal className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>{selected.size} selected</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => bulkSetActive(true)}>Activate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => bulkSetActive(false)}>Deactivate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBulkCategory("")}>Move to category…</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(true)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button onClick={() => setEditing({ is_active: true, base_unit: "pcs", category: category !== "__all" && category !== "__none" ? category : "" })}>
              <Plus className="mr-1 h-4 w-4" /> New Product
            </Button>
          </div>
        </div>

        {/* Active filter chips */}
        {(category !== "__all" || shopTypeFilter !== "__all" || activeFilter !== "__all" || debouncedSearch) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Filtered by:</span>
            {category !== "__all" && (
              <Chip onClear={() => setCategory("__all")}>Category: {category === "__none" ? "Uncategorized" : category}</Chip>
            )}
            {shopTypeFilter !== "__all" && (
              <Chip onClear={() => setShopTypeFilter("__all")}>Shop: {shopTypes.find((s) => s.code === shopTypeFilter)?.name_bn ?? shopTypeFilter}</Chip>
            )}
            {activeFilter !== "__all" && <Chip onClear={() => setActiveFilter("__all")}>{activeFilter === "active" ? "Active" : "Inactive"}</Chip>}
            {debouncedSearch && <Chip onClear={() => setSearch("")}>Search: {debouncedSearch}</Chip>}
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                        onCheckedChange={(v) => toggleAllOnPage(!!v)}
                      />
                    </TableHead>
                    <TableHead className="w-14"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Pack</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Shop types</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={11} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="py-12 text-center text-muted-foreground">কোন product নেই</TableCell></TableRow>
                  ) : (
                    items.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/40" data-state={selected.has(p.id) ? "selected" : undefined}>
                        <TableCell><Checkbox checked={selected.has(p.id)} onCheckedChange={(v) => toggleOne(p.id, !!v)} /></TableCell>
                        <TableCell>
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <div className="font-medium">{p.name_bn}</div>
                          <div className="text-xs text-muted-foreground">{p.name_en}</div>
                          {p.barcode && <div className="text-[10px] text-muted-foreground">#{p.barcode}</div>}
                        </TableCell>
                        <TableCell className="text-sm">{p.brand ?? "—"}</TableCell>
                        <TableCell className="text-sm">{p.pack_size ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {p.category ? <Badge variant="secondary" className="font-normal">{p.category}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {p.shop_types && p.shop_types.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.shop_types.slice(0, 3).map((c) => (
                                <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                              ))}
                              {p.shop_types.length > 3 && <Badge variant="outline" className="text-[10px]">+{p.shop_types.length - 3}</Badge>}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">all</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">৳ {p.default_price ?? 0}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">৳ {p.default_cost ?? 0}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={p.is_active}
                            onCheckedChange={async (v) => {
                              const { error } = await supabase.from("marketplace_products").update({ is_active: v }).eq("id", p.id);
                              if (error) toast.error(error.message);
                              else setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: v } : x)));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-sm">
              <div className="text-muted-foreground">
                {total === 0 ? "0" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`} of {total}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="ml-2 flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="px-2 text-xs">Page {page} / {totalPages}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>নাম (Bangla)</Label><Input value={editing?.name_bn ?? ""} onChange={(e) => setEditing({ ...editing, name_bn: e.target.value })} /></div>
              <div><Label>Name (English)</Label><Input value={editing?.name_en ?? ""} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Brand</Label><Input value={editing?.brand ?? ""} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} placeholder="Square, ACI, Pran…" /></div>
              <div><Label>Pack size</Label><Input value={editing?.pack_size ?? ""} onChange={(e) => setEditing({ ...editing, pack_size: e.target.value })} placeholder="500 mg, 1 L, 100 g" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Default price (৳)</Label><Input type="number" value={editing?.default_price ?? 0} onChange={(e) => setEditing({ ...editing, default_price: Number(e.target.value) })} /></div>
              <div><Label>Default cost (৳)</Label><Input type="number" value={editing?.default_cost ?? 0} onChange={(e) => setEditing({ ...editing, default_cost: Number(e.target.value) })} /></div>
              <div><Label>Barcode</Label><Input value={editing?.barcode ?? ""} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <CategoryCombobox
                  value={editing?.category ?? ""}
                  options={categories.map((c) => c.name)}
                  onChange={(v) => setEditing({ ...editing, category: v })}
                />
              </div>
              <div><Label>Base Unit</Label><Input value={editing?.base_unit ?? ""} onChange={(e) => setEditing({ ...editing, base_unit: e.target.value })} /></div>
            </div>
            <div><Label>Slug (auto if empty)</Label><Input value={editing?.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto-generated" /></div>
            <div>
              <Label>Product image</Label>
              <div className="mt-1 flex items-start gap-3">
                <div className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-md border bg-muted">
                  {editing?.image_url ? (
                    <img src={editing.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent">
                      {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>{uploadingImage ? "Uploading…" : "Upload image"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadImage(f);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {editing?.image_url && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing({ ...editing, image_url: null })}>
                        <X className="mr-1 h-3.5 w-3.5" /> Remove
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="…or paste image URL"
                    value={editing?.image_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Shop types (relevant for which shops)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {shopTypes.map((st) => {
                  const active = (editing?.shop_types ?? []).includes(st.code);
                  return (
                    <button
                      key={st.code}
                      type="button"
                      onClick={() => toggleShopType(st.code)}
                      className={`rounded-full border px-3 py-1 text-xs ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {st.name_bn}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">কিছু না বাছাই করলে সব shop type-এ suggest হবে।</p>
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

      {/* Bulk delete confirm */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} products?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Existing seller listings referencing them may break.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk assign category */}
      <Dialog open={bulkCategory !== null} onOpenChange={(o) => !o && setBulkCategory(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Move {selected.size} to category</DialogTitle></DialogHeader>
          <CategoryCombobox value={bulkCategory ?? ""} options={categories.map((c) => c.name)} onChange={(v) => setBulkCategory(v)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCategory(null)}>Cancel</Button>
            <Button onClick={() => bulkAssignCategory(bulkCategory ?? "")}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryRow({ label, count, active, onClick, muted }: { label: string; count?: number; active: boolean; onClick: () => void; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors ${active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"} ${muted ? "text-muted-foreground" : ""}`}
    >
      <span className="truncate">{label}</span>
      {typeof count === "number" && <span className="ml-2 shrink-0 text-xs text-muted-foreground">{count}</span>}
    </button>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5">
      {children}
      <button type="button" onClick={onClear} className="rounded-full hover:bg-muted"><X className="h-3 w-3" /></button>
    </span>
  );
}

function CategoryCombobox({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const filtered = useMemo(() => {
    const q = input.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [input, options]);
  const showCreate = input.trim() && !options.some((o) => o.toLowerCase() === input.toLowerCase().trim());
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">{value || "Select or create category…"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or type new…" value={input} onValueChange={setInput} />
          <CommandList>
            <CommandEmpty>No matches</CommandEmpty>
            {showCreate && (
              <CommandGroup heading="Create">
                <CommandItem onSelect={() => { onChange(input.trim()); setOpen(false); setInput(""); }}>
                  <Plus className="mr-2 h-4 w-4" /> Create "{input.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Existing">
              {filtered.map((o) => (
                <CommandItem key={o} onSelect={() => { onChange(o); setOpen(false); setInput(""); }}>
                  <Check className={`mr-2 h-4 w-4 ${value === o ? "opacity-100" : "opacity-0"}`} />
                  {o}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* =================== Listings Tab =================== */

type Listing = {
  id: string;
  price: number;
  stock: number;
  unit: string | null;
  min_order: number | null;
  is_published: boolean;
  created_at: string;
  product_id: string;
  shop_id: string;
  marketplace_products?: { name_bn: string; name_en: string } | null;
  shops?: { name: string } | null;
};

function ListingsTab() {
  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 350);
  const [publishedFilter, setPublishedFilter] = useState("__all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("marketplace_listings")
      .select("*, marketplace_products(name_bn, name_en), shops(name)", { count: "exact" });
    if (publishedFilter !== "__all") q = q.eq("is_published", publishedFilter === "live");
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    q = q.order("created_at", { ascending: false }).range(from, to);
    const { data, count, error } = await q;
    if (error) toast.error(error.message);
    let rows = (data as any as Listing[]) ?? [];
    if (debouncedSearch.trim()) {
      const s = debouncedSearch.toLowerCase();
      rows = rows.filter(
        (l) =>
          (l.marketplace_products?.name_bn ?? "").toLowerCase().includes(s) ||
          (l.marketplace_products?.name_en ?? "").toLowerCase().includes(s) ||
          (l.shops?.name ?? "").toLowerCase().includes(s),
      );
    }
    setItems(rows);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [debouncedSearch, publishedFilter, page, pageSize]);
  useEffect(() => { setPage(1); }, [debouncedSearch, publishedFilter, pageSize]);

  const togglePublish = async (l: Listing) => {
    const { error } = await supabase.from("marketplace_listings").update({ is_published: !l.is_published }).eq("id", l.id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_published: !x.is_published } : x)));
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search product or shop…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={publishedFilter} onValueChange={setPublishedFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Min order</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">কোন listing নেই</TableCell></TableRow>
                ) : (
                  items.map((l) => (
                    <TableRow key={l.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="font-medium">{l.marketplace_products?.name_bn ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{l.marketplace_products?.name_en ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-sm">{l.shops?.name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">৳ {l.price}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.stock}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.min_order ?? 1}</TableCell>
                      <TableCell className="text-sm">{l.unit ?? "pcs"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={l.is_published ? "default" : "secondary"}>{l.is_published ? "Live" : "Hidden"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => togglePublish(l)}>
                          {l.is_published ? "Unpublish" : "Publish"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-sm">
            <div className="text-muted-foreground">
              {total === 0 ? "0" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>{[25, 50, 100, 200].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="px-2 text-xs">Page {page} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MarketplacePage;
