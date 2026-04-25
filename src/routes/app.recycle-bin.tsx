import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { recycleBinQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Tab = "products" | "customers" | "suppliers" | "sales" | "purchases" | "expenses" | "customer_wishlists";

const tabLabels: Record<Tab, { bn: string; en: string }> = {
  products: { bn: "প্রোডাক্ট", en: "Products" },
  customers: { bn: "কাস্টমার", en: "Customers" },
  suppliers: { bn: "সাপ্লায়ার", en: "Suppliers" },
  sales: { bn: "বেচা", en: "Sales" },
  purchases: { bn: "কেনা", en: "Purchases" },
  expenses: { bn: "খরচ", en: "Expenses" },
  customer_wishlists: { bn: "গ্রাহক ফর্দ", en: "Wishlists" },
};

export const Route = createFileRoute("/app/recycle-bin")({
  component: RecycleBinPage,
});

function RecycleBinPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("products");
  const { data: rawData = [], refetch } = useQuery(recycleBinQuery(current?.id ?? null, tab));
  const rows = rawData as unknown as Record<string, unknown>[];

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["recycle"] }); await refetch(); };

  const restore = async (id: string) => {
    const { error } = await supabase.from(tab).update({ deleted_at: null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "পুনরুদ্ধার হয়েছে" : "Restored");
    void refresh();
  };

  const purge = async (id: string) => {
    if (!confirm(lang === "bn" ? "স্থায়ীভাবে ডিলিট করবেন?" : "Permanently delete?")) return;
    const { error } = await supabase.from(tab).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Permanently deleted");
    void refresh();
  };

  const columns = useMemo(() => {
    if (tab === "products") return [{ key: "name", label: lang === "bn" ? "নাম" : "Name" }, { key: "stock", label: lang === "bn" ? "মজুদ" : "Stock" }];
    if (tab === "customers" || tab === "suppliers") return [{ key: "name", label: lang === "bn" ? "নাম" : "Name" }, { key: "phone", label: lang === "bn" ? "ফোন" : "Phone" }];
    if (tab === "expenses") return [{ key: "category", label: lang === "bn" ? "ক্যাটাগরি" : "Category" }, { key: "amount", label: lang === "bn" ? "পরিমাণ" : "Amount", money: true }];
    if (tab === "customer_wishlists") return [{ key: "customer_name", label: lang === "bn" ? "গ্রাহক" : "Customer" }, { key: "customer_phone", label: lang === "bn" ? "ফোন" : "Phone" }];
    return [{ key: "invoice_no", label: lang === "bn" ? "ইনভয়েস" : "Invoice" }, { key: "total", label: lang === "bn" ? "মোট" : "Total", money: true }];
  }, [tab, lang]);

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Recycle Bin</div>
      <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "রিসাইকেল বিন" : "Recycle Bin"}</h1>

      <div className="mt-4 overflow-x-auto">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            {(Object.keys(tabLabels) as Tab[]).map((t) => (
              <TabsTrigger key={t} value={t}>{lang === "bn" ? tabLabels[t].bn : tabLabels[t].en}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        {rows.length === 0 ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} title={lang === "bn" ? "এই বিন খালি" : "Bin is empty"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                <TableHead>{lang === "bn" ? "মুছেছেন" : "Deleted at"}</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={String(r.id)}>
                  {columns.map((c) => (
                    <TableCell key={c.key}>
                      {c.money ? fmtMoney(Number(r[c.key] ?? 0), lang) : (r[c.key] ? String(r[c.key]) : "—")}
                    </TableCell>
                  ))}
                  <TableCell className="text-xs text-muted-foreground">
                    {r.deleted_at ? new Date(String(r.deleted_at)).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => restore(String(r.id))} className="gap-1">
                        <RotateCcw className="h-3.5 w-3.5" />
                        {lang === "bn" ? "ফেরত" : "Restore"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => purge(String(r.id))} className="gap-1 border-rose-200 text-rose-600 hover:bg-rose-50">
                        <Trash2 className="h-3.5 w-3.5" />
                        {lang === "bn" ? "স্থায়ী" : "Purge"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
