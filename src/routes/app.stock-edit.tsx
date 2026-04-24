import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

export const Route = createFileRoute("/app/stock-edit")({
  component: StockEditPage,
});

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
      <div className="mb-1 text-xs text-muted-foreground">Stock Management / Stock Update</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/stock" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "স্টক এডিট" : "Stock Edit"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-10 gap-2" onClick={() => { setUpdates({}); nav({ to: "/app/stock" }); }}>
            <X className="h-4 w-4" />
            {lang === "bn" ? "ক্যানসেল" : "Cancel"}
          </Button>
          <Button className="h-10 gap-2 bg-foreground text-background hover:opacity-90" onClick={save} disabled={busy}>
            <Save className="h-4 w-4" />
            {busy ? "..." : lang === "bn" ? "সংরক্ষণ করুন" : "Save"}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <DataToolbar search={search} onSearch={setSearch} onRefresh={() => refetch()} />
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <EmptyState icon={<Package className="h-6 w-6" />} title={lang === "bn" ? "কোনো পণ্য নেই" : "No products"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "bn" ? "পণ্যের নাম" : "Product"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "বর্তমান মজুদ" : "Stock"}</TableHead>
                <TableHead className="text-right">{lang === "bn" ? "দর" : "Cost"}</TableHead>
                <TableHead className="text-center w-[260px]">{lang === "bn" ? "আপডেটেড স্টক" : "Updated stock"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const cur = updates[p.id] ?? Number(p.stock);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-muted">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{lang === "bn" ? bnNum(p.stock) : p.stock}</TableCell>
                    <TableCell className="text-right">{fmtMoney(Number(p.cost_price), lang)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-10 bg-rose-100 text-rose-600 hover:bg-rose-200 border-rose-200"
                          onClick={() => setQty(p.id, Math.max(0, cur - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={cur}
                          onChange={(e) => setQty(p.id, Math.max(0, Number(e.target.value) || 0))}
                          className="h-9 text-center font-semibold"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-10 bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500"
                          onClick={() => setQty(p.id, cur + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
          Showing 1 to {filtered.length} of {filtered.length} Products
        </div>
      </div>
    </div>
  );
}