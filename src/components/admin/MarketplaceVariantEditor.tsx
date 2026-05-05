import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, X, Layers } from "lucide-react";
import { toast } from "sonner";

type ValueRow = { code: string; label_en: string; label_bn?: string; hex?: string };
type Preset = { id: string; name_en: string; name_bn: string; attribute_type: string; values: ValueRow[] };

type VariantRow = {
  id?: string;
  variant_label_en: string;
  variant_label_bn: string | null;
  attributes: Record<string, string>;
  image_url: string | null;
  barcode: string | null;
  pack_size: string | null;
  default_price: number | null;
  default_cost: number | null;
  sort_order: number;
  is_active: boolean;
  _delete?: boolean;
};

type Group = { presetId: string; preset: Preset; selectedCodes: string[] };

function buildLabel(groups: Group[], attrs: Record<string, string>) {
  const parts: string[] = [];
  for (const g of groups) {
    const code = attrs[g.preset.name_en];
    const v = g.preset.values.find((x) => x.code === code);
    if (v) parts.push(`${g.preset.name_en}: ${v.label_en}`);
  }
  return parts.join(" / ");
}
function buildLabelBn(groups: Group[], attrs: Record<string, string>) {
  const parts: string[] = [];
  for (const g of groups) {
    const code = attrs[g.preset.name_en];
    const v = g.preset.values.find((x) => x.code === code);
    if (v) parts.push(`${g.preset.name_bn}: ${v.label_bn ?? v.label_en}`);
  }
  return parts.join(" / ");
}

function cartesian(groups: Group[]): Record<string, string>[] {
  if (groups.length === 0) return [];
  let out: Record<string, string>[] = [{}];
  for (const g of groups) {
    const next: Record<string, string>[] = [];
    for (const row of out) {
      for (const code of g.selectedCodes) {
        next.push({ ...row, [g.preset.name_en]: code });
      }
    }
    out = next;
  }
  return out;
}

export function MarketplaceVariantEditor({
  productId,
  defaultPrice,
  defaultCost,
}: {
  productId: string;
  defaultPrice?: number | null;
  defaultCost?: number | null;
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addPresetId, setAddPresetId] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const [{ data: ps }, { data: vs }] = await Promise.all([
        supabase.from("variant_attribute_presets").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("marketplace_product_variants").select("*").eq("marketplace_product_id", productId).order("sort_order"),
      ]);
      const pres = ((ps as unknown) as Preset[]) ?? [];
      setPresets(pres);
      const rows: VariantRow[] = ((vs as unknown) as VariantRow[]) ?? [];
      setVariants(rows);

      // Reconstruct groups from existing variants
      const usedAttrs = new Set<string>();
      rows.forEach((r) => Object.keys(r.attributes ?? {}).forEach((k) => usedAttrs.add(k)));
      const reconstructed: Group[] = [];
      for (const name of usedAttrs) {
        const p = pres.find((x) => x.name_en === name);
        if (!p) continue;
        const codes = Array.from(new Set(rows.map((r) => r.attributes[name]).filter(Boolean)));
        reconstructed.push({ presetId: p.id, preset: p, selectedCodes: codes });
      }
      setGroups(reconstructed);
      setLoading(false);
    })();
  }, [productId]);

  const addGroup = () => {
    if (!addPresetId) return;
    if (groups.find((g) => g.presetId === addPresetId)) return toast.error("Already added");
    const p = presets.find((x) => x.id === addPresetId);
    if (!p) return;
    setGroups([...groups, { presetId: p.id, preset: p, selectedCodes: [] }]);
    setAddPresetId("");
  };

  const removeGroup = (presetId: string) => {
    setGroups(groups.filter((g) => g.presetId !== presetId));
  };

  const toggleCode = (presetId: string, code: string) => {
    setGroups(groups.map((g) =>
      g.presetId === presetId
        ? { ...g, selectedCodes: g.selectedCodes.includes(code) ? g.selectedCodes.filter((c) => c !== code) : [...g.selectedCodes, code] }
        : g,
    ));
  };

  const generate = () => {
    if (groups.length === 0 || groups.some((g) => g.selectedCodes.length === 0)) {
      return toast.error("প্রতিটি group থেকে অন্তত একটি value বাছাই করুন");
    }
    const combos = cartesian(groups);
    const existing = new Map<string, VariantRow>();
    variants.forEach((v) => existing.set(JSON.stringify(v.attributes), v));
    const next: VariantRow[] = combos.map((attrs, i) => {
      const key = JSON.stringify(attrs);
      if (existing.has(key)) return { ...existing.get(key)!, _delete: false };
      return {
        variant_label_en: buildLabel(groups, attrs),
        variant_label_bn: buildLabelBn(groups, attrs) || null,
        attributes: attrs,
        image_url: null,
        barcode: null,
        pack_size: null,
        default_price: defaultPrice ?? null,
        default_cost: defaultCost ?? null,
        sort_order: i,
        is_active: true,
      };
    });
    // Mark variants outside the new combo set as deletable
    const newKeys = new Set(combos.map((a) => JSON.stringify(a)));
    const stale = variants.filter((v) => v.id && !newKeys.has(JSON.stringify(v.attributes))).map((v) => ({ ...v, _delete: true }));
    setVariants([...next, ...stale]);
    toast.success(`${combos.length} টি variant ready`);
  };

  const updRow = (idx: number, patch: Partial<VariantRow>) => {
    const v = [...variants];
    v[idx] = { ...v[idx], ...patch };
    setVariants(v);
  };

  const removeRow = (idx: number) => {
    const v = variants[idx];
    if (v.id) updRow(idx, { _delete: true });
    else setVariants(variants.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true);
    try {
      const toDelete = variants.filter((v) => v.id && v._delete).map((v) => v.id!);
      if (toDelete.length > 0) {
        const { error } = await supabase.from("marketplace_product_variants").delete().in("id", toDelete);
        if (error) throw error;
      }
      const live = variants.filter((v) => !v._delete);
      for (let i = 0; i < live.length; i++) {
        const v = live[i];
        const payload = {
          marketplace_product_id: productId,
          variant_label_en: v.variant_label_en,
          variant_label_bn: v.variant_label_bn,
          attributes: v.attributes,
          image_url: v.image_url,
          barcode: v.barcode,
          pack_size: v.pack_size,
          default_price: v.default_price,
          default_cost: v.default_cost,
          sort_order: i,
          is_active: v.is_active,
        };
        const { error } = v.id
          ? await supabase.from("marketplace_product_variants").update(payload).eq("id", v.id)
          : await supabase.from("marketplace_product_variants").insert(payload);
        if (error) throw error;
      }
      toast.success("Variants saved");
      // Reload
      const { data } = await supabase.from("marketplace_product_variants").select("*").eq("marketplace_product_id", productId).order("sort_order");
      setVariants(((data as unknown) as VariantRow[]) ?? []);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const visible = variants.filter((v) => !v._delete);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Layers className="h-4 w-4" /> Variant Groups</div>

        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.presetId} className="rounded border bg-background p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold">{g.preset.name_en} ({g.preset.name_bn})</span>
                <Button variant="ghost" size="sm" onClick={() => removeGroup(g.presetId)}><X className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {g.preset.values.map((v) => {
                  const sel = g.selectedCodes.includes(v.code);
                  return (
                    <button
                      key={v.code}
                      type="button"
                      onClick={() => toggleCode(g.presetId, v.code)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${sel ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {v.hex && <span className="mr-1 inline-block h-2 w-2 rounded-full border" style={{ background: v.hex }} />}
                      {v.label_en}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <Select value={addPresetId} onValueChange={setAddPresetId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Add variant group..." /></SelectTrigger>
            <SelectContent>
              {presets.filter((p) => !groups.find((g) => g.presetId === p.id)).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name_en} ({p.attribute_type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={addGroup} disabled={!addPresetId}><Plus className="mr-1 h-4 w-4" />Add</Button>
          <Button type="button" variant="outline" onClick={generate}>Generate</Button>
        </div>
      </div>

      {visible.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Variants ({visible.length})</div>
          <div className="grid grid-cols-12 gap-1.5 rounded-t border border-b-0 bg-muted px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="col-span-12 sm:col-span-4">Variant / ভ্যারিয়েন্ট</div>
            <div className="col-span-6 sm:col-span-2">Sale ৳ / বিক্রয়</div>
            <div className="col-span-6 sm:col-span-2">Cost ৳ / ক্রয়</div>
            <div className="col-span-6 sm:col-span-2">Pack / প্যাক</div>
            <div className="col-span-5 sm:col-span-1">Barcode</div>
            <div className="col-span-1" />
          </div>
          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1 -mt-2">
            {variants.map((v, idx) => v._delete ? null : (
              <div key={idx} className="grid grid-cols-12 gap-1.5 rounded border p-2">
                <div className="col-span-12 sm:col-span-4 text-xs">
                  <div className="font-medium">{v.variant_label_en}</div>
                  {v.variant_label_bn && <div className="text-muted-foreground">{v.variant_label_bn}</div>}
                </div>
                <Input className="col-span-6 sm:col-span-2 h-8 text-xs" placeholder="Price" type="number" value={v.default_price ?? ""} onChange={(e) => updRow(idx, { default_price: e.target.value === "" ? null : Number(e.target.value) })} />
                <Input className="col-span-6 sm:col-span-2 h-8 text-xs" placeholder="Cost" type="number" value={v.default_cost ?? ""} onChange={(e) => updRow(idx, { default_cost: e.target.value === "" ? null : Number(e.target.value) })} />
                <Input className="col-span-6 sm:col-span-2 h-8 text-xs" placeholder="Pack" value={v.pack_size ?? ""} onChange={(e) => updRow(idx, { pack_size: e.target.value || null })} />
                <Input className="col-span-5 sm:col-span-1 h-8 text-xs" placeholder="Barcode" value={v.barcode ?? ""} onChange={(e) => updRow(idx, { barcode: e.target.value || null })} />
                <Button variant="ghost" size="sm" className="col-span-1" onClick={() => removeRow(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Variants"}
        </Button>
      </div>
    </div>
  );
}