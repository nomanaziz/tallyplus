import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, History, Pencil, Plus, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataToolbar } from "@/components/app/DataToolbar";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  cost_price: number;
  stock: number;
  image_url: string | null;
};

type Movement = {
  id: string;
  product_id: string;
  qty: number;
  type: string;
  note: string | null;
  created_at: string;
};

export const Route = createFileRoute("/app/stock")({
  component: StockPage,
});

function StockPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [history, setHistory] = useState<Movement[] | null>(null);

  const load = async () => {
    if (!current) return;
    const { data } = await supabase
      .from("products")
      .select("id,name,cost_price,stock,image_url")
      .eq("shop_id", current.id)
      .is("deleted_at", null)
      .order("name");
    setItems((data as Product[]) ?? []);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [current?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((p) => p.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const totalValue = useMemo(
    () => filtered.reduce((sum, p) => sum + Number(p.cost_price) * Number(p.stock), 0),
    [filtered],
  );

  const loadHistory = async () => {
    if (!current) return;
    const { data } = await supabase
      .from("stock_movements")
      .select("id,product_id,qty,type,note,created_at")
      .eq("shop_id", current.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setHistory((data as Movement[]) ?? []);
  };

  const adjust = async (p: Product, newStock: number, note: string) => {
    if (!current || !user) return;
    const diff = newStock - Number(p.stock);
    if (diff === 0) { setEditing(null); return; }
    const { error: e1 } = await supabase.from("products").update({ stock: newStock }).eq("id", p.id);
    if (e1) { toast.error(e1.message); return; }
    await supabase.from("stock_movements").insert({
      shop_id: current.id,
      product_id: p.id,
      qty: Math.abs(diff),
      type: diff > 0 ? "in" : "out",
      note: note || "manual adjust",
      created_by: user.id,
    });
    toast.success(lang === "bn" ? "আপডেট হয়েছে" : "Updated");
    setEditing(null);
    void load();
  };

  const productMap = useMemo(() => Object.fromEntries(items.map((p) => [p.id, p.name])), [items]);

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Stock Management</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "স্টক খাতা" : "Stock Ledger"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-10 gap-2" onClick={loadHistory}>
            <History className="h-4 w-4" />
            {lang === "bn" ? "স্টকের ইতিহাস" : "Stock history"}
          </Button>
          <Button variant="outline" className="h-10 gap-2" onClick={() => nav({ to: "/app/products" })}>
            <Pencil className="h-4 w-4" />
            {lang === "bn" ? "স্টক এডিট" : "Stock edit"}
          </Button>
          <Button className="h-10 gap-2" onClick={() => nav({ to: "/app/products" })}>
            <Plus className="h-4 w-4" />
            {lang === "bn" ? "প্রোডাক্ট যুক্ত করুন" : "Add product"}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <DataToolbar search={search} onSearch={setSearch} onRefresh={load} />
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <EmptyState icon={<Package className="h-6 w-6" />} title={lang === "bn" ? "কোনো পণ্য নেই" : "No products"} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lang === "bn" ? "পণ্যের নাম" : "Product"}</TableHead>
                  <TableHead className="text-right">{lang === "bn" ? "বর্তমান মজুদ" : "Stock"}</TableHead>
                  <TableHead className="text-right">{lang === "bn" ? "দর" : "Cost"}</TableHead>
                  <TableHead className="text-right">{lang === "bn" ? "মোট মজুদ মূল্য" : "Stock value"}</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
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
                    <TableCell className="text-right font-semibold">{fmtMoney(Number(p.cost_price) * Number(p.stock), lang)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">Showing 1 to {filtered.length} of {filtered.length}</span>
              <span className="font-semibold">{lang === "bn" ? "মোট মূল্য:" : "Total value:"} {fmtMoney(totalValue, lang)}</span>
            </div>
          </>
        )}
      </div>

      <StockEditDialog product={editing} onClose={() => setEditing(null)} onSave={adjust} />

      <Dialog open={history !== null} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lang === "bn" ? "স্টকের ইতিহাস" : "Stock history"}</DialogTitle>
          </DialogHeader>
          {history && history.length === 0 ? (
            <EmptyState title={lang === "bn" ? "কোনো রেকর্ড নেই" : "No records"} />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{lang === "bn" ? "তারিখ" : "Date"}</TableHead>
                    <TableHead>{lang === "bn" ? "পণ্য" : "Product"}</TableHead>
                    <TableHead>{lang === "bn" ? "ধরন" : "Type"}</TableHead>
                    <TableHead className="text-right">{lang === "bn" ? "পরিমাণ" : "Qty"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{new Date(m.created_at).toLocaleString()}</TableCell>
                      <TableCell>{productMap[m.product_id] ?? "—"}</TableCell>
                      <TableCell><span className={m.type === "in" ? "text-emerald-600" : "text-destructive"}>{m.type}</span></TableCell>
                      <TableCell className="text-right">{lang === "bn" ? bnNum(m.qty) : m.qty}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StockEditDialog({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (p: Product, newStock: number, note: string) => void;
}) {
  const { lang } = useI18n();
  const [val, setVal] = useState("0");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (product) { setVal(String(product.stock)); setNote(""); }
  }, [product]);
  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === "bn" ? "স্টক এডিট" : "Edit stock"} — {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "নতুন মজুদ পরিমাণ" : "New stock"}</Label>
            <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "bn" ? "নোট" : "Note"}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={() => product && onSave(product, Number(val) || 0, note)}>{lang === "bn" ? "সেভ" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}