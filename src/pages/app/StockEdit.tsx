import { useNavigate } from "@/lib/router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, X, Minus, Plus, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { productsLiteQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataToolbar } from "@/components/app/DataToolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  cost_price: number;
  sale_price: number;
  stock: number;
  image_url: string | null;
};



function StockEditPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: itemsRaw = [], refetch } = useQuery(productsLiteQuery(current?.id ?? null));
  const items = itemsRaw as unknown as Product[];
  const [search, setSearch] = useState("");
  const [updates, setUpdates] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((p) => p.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const setQty = (id: string, v: number) => setUpdates((u) => ({ ...u, [id]: v }));

  const save = async () => {
    if (!current || !user) return;
    const changes = items.filter((p) => updates[p.id] != null && updates[p.id] !== Number(p.stock));
    if (changes.length === 0) { toast.info(lang === "bn" ? "কোনো পরিবর্তন নেই" : "No changes"); return; }
    setBusy(true);
    for (const p of changes) {
      const newStock = updates[p.id];
      const diff = newStock - Number(p.stock);
      const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", p.id);
      if (error) { toast.error(error.message); setBusy(false); return; }
      await supabase.from("stock_movements").insert({
        shop_id: current.id,
        product_id: p.id,
        qty: Math.abs(diff),
        type: diff > 0 ? "in" : "out",
        note: "bulk edit",
        created_by: user.id,
      });
    }
    setBusy(false);
    toast.success(lang === "bn" ? "সংরক্ষণ হয়েছে" : "Saved");
    setUpdates({});
    await qc.invalidateQueries({ queryKey: ["products"] });
    await refetch();
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-2 text-xs text-muted-foreground">Stock Management / Stock Update</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => nav({ to: "/app/stock" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            <span className="border-b-2 border-foreground/80 pb-0.5">{lang === "bn" ? "স্টক এডিট" : "Stock Edit"}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-10 gap-2" onClick={() => { setUpdates({}); nav({ to: "/app/stock" }); }}>
            <X className="h-4 w-4" />
            {lang === "bn" ? "ক্যানসেল" : "Cancel"}
          </Button>
          <Button className="h-10 gap-2 bg-foreground text-background hover:opacity-90 disabled:opacity-50" onClick={save} disabled={busy || Object.keys(updates).length === 0}>
            <Save className="h-4 w-4" />
            {busy ? "..." : lang === "bn" ? "সংরক্ষণ করুন" : "Save"}
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <DataToolbar search={search} onSearch={setSearch} onRefresh={() => refetch()} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState icon={<Package className="h-6 w-6" />} title={lang === "bn" ? "কোনো পণ্য নেই" : "No products"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lang === "bn" ? "পণ্যের নাম" : "Product"}</TableHead>
                <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lang === "bn" ? "বর্তমান মজুদ" : "Stock"}</TableHead>
                <TableHead className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lang === "bn" ? "দর" : "Cost"}</TableHead>
                <TableHead className="py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground w-[280px]">{lang === "bn" ? "আপডেটেড স্টক" : "Updated stock"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const cur = updates[p.id] ?? Number(p.stock);
                const changed = updates[p.id] != null && updates[p.id] !== Number(p.stock);
                return (
                  <TableRow key={p.id} className={"transition " + (changed ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-muted/30")}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-muted">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="h-9 w-9 rounded-md object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{lang === "bn" ? bnNum(p.stock) : p.stock}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(Number(p.cost_price), lang)}</TableCell>
                    <TableCell>
                      <div className="mx-auto flex w-[260px] items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-12 rounded-md bg-rose-100 text-lg font-bold text-rose-600 hover:bg-rose-200 border-rose-200"
                          onClick={() => setQty(p.id, Math.max(0, cur - 1))}
                        >
                          <Minus className="h-5 w-5" />
                        </Button>
                        <Input
                          type="number"
                          value={cur}
                          onChange={(e) => setQty(p.id, Math.max(0, Number(e.target.value) || 0))}
                          className={"h-10 text-center text-base font-semibold tabular-nums " + (changed ? "border-b-2 border-b-blue-500 focus-visible:ring-blue-500" : "")}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-12 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500"
                          onClick={() => setQty(p.id, cur + 1)}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {filtered.length > 0 && (
          <div className="border-t bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
            Showing 1 to {filtered.length} of {filtered.length} Products
          </div>
        )}
      </div>
    </div>
  );
}
export default StockEditPage;
