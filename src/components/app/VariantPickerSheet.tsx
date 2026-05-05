import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Package, Layers } from "lucide-react";
import { toast } from "sonner";
import type { CatalogProduct } from "@/components/app/CatalogProductPicker";

type Variant = {
  id: string;
  variant_label_en: string;
  variant_label_bn: string | null;
  attributes: Record<string, string>;
  image_url: string | null;
  barcode: string | null;
  pack_size: string | null;
  default_price: number | null;
  default_cost: number | null;
};

type Row = Variant & {
  picked: boolean;
  qty: string;
  sale: string;
  cost: string;
};

export function VariantPickerSheet({
  open,
  onOpenChange,
  catalogProduct,
  shopId,
  trackStock,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  catalogProduct: CatalogProduct | null;
  shopId: string;
  trackStock: boolean;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkCost, setBulkCost] = useState("");
  const [bulkQty, setBulkQty] = useState("");

  useEffect(() => {
    if (!open || !catalogProduct) return;
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("marketplace_product_variants")
        .select("*")
        .eq("marketplace_product_id", catalogProduct.id)
        .eq("is_active", true)
        .order("sort_order");
      const variants = ((data as unknown) as Variant[]) ?? [];
      setRows(
        variants.map((v) => ({
          ...v,
          picked: true,
          qty: "",
          sale: v.default_price != null ? String(v.default_price) : (catalogProduct.default_price ? String(catalogProduct.default_price) : ""),
          cost: v.default_cost != null ? String(v.default_cost) : (catalogProduct.default_cost ? String(catalogProduct.default_cost) : ""),
        })),
      );
      setLoading(false);
    })();
  }, [open, catalogProduct]);

  const upd = (idx: number, patch: Partial<Row>) => {
    const next = [...rows];
    next[idx] = { ...next[idx], ...patch };
    setRows(next);
  };

  const applyBulk = () => {
    setRows(rows.map((r) => ({
      ...r,
      sale: bulkPrice && r.picked ? bulkPrice : r.sale,
      cost: bulkCost && r.picked ? bulkCost : r.cost,
      qty: bulkQty && r.picked ? bulkQty : r.qty,
    })));
  };

  const allPicked = rows.length > 0 && rows.every((r) => r.picked);
  const togglePickAll = () => setRows(rows.map((r) => ({ ...r, picked: !allPicked })));

  const save = async () => {
    if (!catalogProduct) return;
    const picked = rows.filter((r) => r.picked);
    if (picked.length === 0) { toast.error("অন্তত একটি variant select করুন"); return; }
    setSaving(true);
    try {
      // Create parent product (no stock — parent is just a grouping shell)
      const parentName = catalogProduct.name_bn;
      const { data: parentRow, error: pErr } = await supabase
        .from("products")
        .insert({
          name: parentName,
          unit: catalogProduct.base_unit ?? "pcs",
          cost_price: 0,
          sale_price: 0,
          stock: 0,
          shop_id: shopId,
          brand: catalogProduct.brand,
        })
        .select("id")
        .maybeSingle();
      if (pErr) throw pErr;
      const parentId = (parentRow as { id?: string } | null)?.id;
      if (!parentId) throw new Error("Could not create parent");

      // Insert variant child rows
      const childPayload = picked.map((r) => ({
        shop_id: shopId,
        parent_product_id: parentId,
        name: `${parentName} — ${r.variant_label_bn ?? r.variant_label_en}`,
        unit: catalogProduct.base_unit ?? "pcs",
        cost_price: Number(r.cost) || 0,
        sale_price: Number(r.sale) || 0,
        stock: trackStock ? (Number(r.qty) || 0) : -1,
        barcode: r.barcode,
        image_url: r.image_url ?? catalogProduct.image_url,
        brand: catalogProduct.brand,
        variant_label: r.variant_label_en,
        variant_attributes: r.attributes,
      }));
      const { error: cErr } = await supabase.from("products").insert(childPayload);
      if (cErr) throw cErr;
      toast.success(`${picked.length} টি variant যোগ হয়েছে`);
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Variant select করুন</SheetTitle>
        </SheetHeader>

        {catalogProduct && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border p-3">
            {catalogProduct.image_url ? (
              <img src={catalogProduct.image_url} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted"><Package className="h-5 w-5" /></div>
            )}
            <div className="min-w-0">
              <div className="truncate font-medium">{catalogProduct.name_bn}</div>
              <div className="truncate text-xs text-muted-foreground">{catalogProduct.brand} {catalogProduct.pack_size && `• ${catalogProduct.pack_size}`}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">এই product-এর কোনো variant নেই।</p>
        ) : (
          <div className="mt-4 space-y-4 pb-32">
            {/* Bulk fill */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 text-xs font-semibold">সব variant একসাথে fill করুন</div>
              <div className="grid grid-cols-3 gap-2">
                {trackStock && <Input placeholder="Qty" type="number" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} />}
                <Input placeholder="Sale ৳" type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} />
                <Input placeholder="Cost ৳" type="number" value={bulkCost} onChange={(e) => setBulkCost(e.target.value)} />
              </div>
              <Button type="button" size="sm" variant="outline" className="mt-2 w-full" onClick={applyBulk}>Apply to selected</Button>
            </div>

            <div className="flex items-center gap-2 px-1">
              <Checkbox checked={allPicked} onCheckedChange={togglePickAll} />
              <Label className="text-xs">সব select / unselect করুন</Label>
            </div>

            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={r.id} className={`rounded-lg border p-3 ${r.picked ? "bg-background" : "bg-muted/30 opacity-60"}`}>
                  <div className="flex items-start gap-2">
                    <Checkbox className="mt-1" checked={r.picked} onCheckedChange={(v) => upd(i, { picked: !!v })} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{r.variant_label_bn ?? r.variant_label_en}</div>
                      {r.pack_size && <div className="text-xs text-muted-foreground">{r.pack_size}</div>}
                    </div>
                  </div>
                  {r.picked && (
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {trackStock && (
                        <div>
                          <Label className="text-[10px]">Qty</Label>
                          <Input className="h-8" type="number" value={r.qty} onChange={(e) => upd(i, { qty: e.target.value })} />
                        </div>
                      )}
                      <div>
                        <Label className="text-[10px]">Sale ৳</Label>
                        <Input className="h-8" type="number" value={r.sale} onChange={(e) => upd(i, { sale: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Cost ৳</Label>
                        <Input className="h-8" type="number" value={r.cost} onChange={(e) => upd(i, { cost: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <SheetFooter className="fixed bottom-0 left-0 right-0 border-t bg-background p-3 sm:relative sm:p-0 sm:pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving || rows.length === 0} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `${rows.filter((r) => r.picked).length} টি যোগ করুন`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}