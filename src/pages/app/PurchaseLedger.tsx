import { useNavigate } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, ArrowLeft, MoreVertical, Printer, Eye, Trash2, Download, RefreshCw, Search, Calendar, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { purchasesListQuery, contactsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/app/DateRangePicker";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/app/DataPagination";
import { usePagination } from "@/hooks/use-pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceDialog, type InvoiceData } from "@/components/app/InvoiceDialog";
import { InvoiceEditDialog, type InvoiceEditTarget } from "@/components/app/InvoiceEditDialog";
import { toast } from "sonner";
import { usePermissions } from "@/lib/permissions-hook";
import { printTableReport } from "@/lib/print-report";

type Purchase = {
  id: string;
  invoice_no: string | null;
  supplier_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  payment_method: string;
  created_at: string;
};



function PurchaseLedgerPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { isOwner, isAdmin } = usePermissions();
  const canDelete = isOwner || isAdmin;
  const { data: raw, refetch } = useQuery(purchasesListQuery(current?.id ?? null));
  const list = useMemo(() => (raw as unknown as Purchase[] | undefined) ?? [], [raw]);
  const { data: suppliersData } = useQuery(contactsQuery(current?.id ?? null, "suppliers"));
  const suppliers = useMemo(() => suppliersData ?? [], [suppliersData]);
  const supMap = useMemo(
    () => Object.fromEntries(
      (suppliers as { id: string; name: string; phone: string | null }[])
        .map((s) => [s.id, s])
    ),
    [suppliers]
  );

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "due">("all");
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(todayIso);
  const [to, setTo] = useState(todayIso);

  // Item counts per purchase
  const listIdsKey = useMemo(() => list.map((p) => p.id).join(","), [list]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!listIdsKey) { setItemCounts({}); return; }
    let cancel = false;
    (async () => {
      const ids = listIdsKey.split(",");
      const { data } = await supabase
        .from("purchase_items")
        .select("purchase_id")
        .in("purchase_id", ids);
      if (cancel) return;
      const counts: Record<string, number> = {};
      ((data as { purchase_id: string }[]) ?? []).forEach((r) => {
        counts[r.purchase_id] = (counts[r.purchase_id] ?? 0) + 1;
      });
      setItemCounts(counts);
    })();
    return () => { cancel = true; };
  }, [listIdsKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = new Date(from + "T00:00:00").getTime();
    const toTs = new Date(to + "T23:59:59").getTime();
    return list.filter((p) => {
      const t = new Date(p.created_at).getTime();
      if (t < fromTs || t > toTs) return false;
      if (paymentFilter === "cash" && Number(p.due) > 0) return false;
      if (paymentFilter === "due" && Number(p.due) === 0) return false;
      if (!q) return true;
      const sup = supMap[p.supplier_id ?? ""];
      return (p.invoice_no ?? "").toLowerCase().includes(q)
        || (sup?.name ?? "").toLowerCase().includes(q)
        || (sup?.phone ?? "").toLowerCase().includes(q);
    });
  }, [list, search, supMap, from, to, paymentFilter]);

  const totalAmount = useMemo(() => filtered.reduce((a, p) => a + Number(p.total), 0), [filtered]);
  const pg = usePagination(filtered, 25);

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["purchases"] }); await refetch(); };

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [editTarget, setEditTarget] = useState<InvoiceEditTarget | null>(null);

  const openInvoice = async (p: Purchase) => {
    const { data: items } = await supabase
      .from("purchase_items")
      .select("name,qty,price,total")
      .eq("purchase_id", p.id);
    const sup = supMap[p.supplier_id ?? ""];
    setInvoice({
      mode: "purchase",
      shop: {
        name: current?.name ?? "",
        address: (current as { address?: string | null } | null)?.address ?? null,
        phone: (current as { phone?: string | null } | null)?.phone ?? null,
        logo_url: (current as { logo_url?: string | null } | null)?.logo_url ?? null,
      },
      party: { name: sup?.name ?? null, phone: sup?.phone ?? null, address: null },
      invoiceNo: p.invoice_no ?? p.id.slice(0, 12).toUpperCase(),
      date: p.created_at,
      items: ((items as { name: string; qty: number; price: number; total: number }[]) ?? []).map((it) => ({
        name: it.name, qty: Number(it.qty), price: Number(it.price), total: Number(it.total),
      })),
      subtotal: Number(p.subtotal),
      discount: Number(p.discount),
      delivery: 0,
      grandTotal: Number(p.total),
      paid: Number(p.paid),
      previousDue: 0,
      currentDue: Number(p.due),
    });
  };

  const softDelete = async (p: Purchase) => {
    if (!confirm(t("p5_Delete_this_purchase"))) return;
    const { error } = await supabase
      .from("purchases")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("p5_Deleted"));
    void refresh();
  };

  const printAll = () => {
    printTableReport({
      shopName: current?.name ?? "",
      shopAddress: (current as { address?: string | null } | null)?.address ?? null,
      shopPhone: (current as { phone?: string | null } | null)?.phone ?? null,
      title: t("p5_Purchase_History"),
      startDate: from,
      endDate: to,
      lang,
      columns: [
        { key: "idx", label: "#" },
        { key: "name", label: t("p5_Supplier") },
        { key: "contact", label: t("p5_Contact") },
        { key: "items", label: t("p5_Items"), align: "right" },
        { key: "amount", label: t("p5_Amount"), align: "right" },
        { key: "date", label: t("p5_Date") },
        { key: "status", label: t("p5_Payment_Status") },
      ],
      rows: filtered.map((p, i) => {
        const sup = supMap[p.supplier_id ?? ""];
        const due = Number(p.due);
        return {
          idx: String(i + 1),
          name: sup?.name ?? "—",
          contact: sup?.phone ?? "—",
          items: itemCounts[p.id] ?? 0,
          amount: fmtMoney(Number(p.total), lang),
          date: fmtDate(p.created_at),
          status: due > 0 ? (t("p5_Due_2")) : (t("p5_Paid_4")),
        };
      }),
    });
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const s = d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    return lang === "bn" ? bnNum(s) : s;
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">Purchase Book</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-extrabold md:text-2xl">{t("p5_Purchase_Book")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={printAll} className="h-10 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="h-4 w-4" />
            {t("p5_Download_Print")}
          </Button>
          <div className="rounded-md border bg-card px-3 py-2 text-sm font-semibold">
            {t("p5_Total_7")}{fmtMoney(totalAmount, lang)}
          </div>
          <Button variant="outline" className="h-10 gap-2" onClick={() => nav({ to: "/app/purchase" })}>
            <Plus className="h-4 w-4" />
            {t("p5_New_2")}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("p5_Search_by_name_or_mobile")}
            className="pl-9"
          />
        </div>
        <DateRangePicker
          value={{ start: from, end: to }}
          onChange={(v) => { setFrom(v.start); setTo(v.end); }}
        />
        <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as "all" | "cash" | "due")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("p5_All")}</SelectItem>
            <SelectItem value="cash">{t("p5_Cash")}</SelectItem>
            <SelectItem value="due">{t("p5_Due_2")}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" />
          {t("p5_Refresh")}
        </Button>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-xl border bg-card" id="invoice-print-area">
        {filtered.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title={t("p5_No_purchases")} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("p5_Contact_2")}</TableHead>
                  <TableHead>{t("p5_Invoice_no")}</TableHead>
                  <TableHead>{t("p5_Batch_no")}</TableHead>
                  <TableHead>{t("p5_Items")}</TableHead>
                  <TableHead>{t("p5_Amount_3")}</TableHead>
                  <TableHead>{t("p5_Date")}</TableHead>
                  <TableHead>{t("p5_Payment")}</TableHead>
                  <TableHead className="text-right print:hidden">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.paged.map((p) => {
                  const sup = supMap[p.supplier_id ?? ""];
                  const isPaid = Number(p.due) === 0;
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => void openInvoice(p)}
                    >
                      <TableCell>
                        <div className="font-medium">{sup?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{sup?.phone ?? "---"}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.invoice_no ?? p.id.slice(0, 12).toUpperCase()}</TableCell>
                      <TableCell className="text-muted-foreground">--</TableCell>
                      <TableCell>{lang === "bn" ? bnNum(itemCounts[p.id] ?? 0) : (itemCounts[p.id] ?? 0)}</TableCell>
                      <TableCell className="font-semibold">{fmtMoney(Number(p.total), lang)}</TableCell>
                      <TableCell className="text-xs">{fmtDate(p.created_at)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {isPaid ? (t("p5_Cash_2")) : (t("p5_Due_2"))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right print:hidden" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void openInvoice(p)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t("p5_View_Print_invoice")}
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem onClick={() => setEditTarget({ kind: "purchase", id: p.id, shopId: current?.id ?? "" })}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("p5_Edit_invoice")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => void openInvoice(p)}>
                              <Printer className="mr-2 h-4 w-4" />
                              {t("p5_Print")}
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem className="text-rose-600" onClick={() => void softDelete(p)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("p5_Delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DataPagination
              page={pg.page}
              pageCount={pg.pageCount}
              pageSize={pg.pageSize}
              total={pg.total}
              from={pg.from}
              to={pg.to}
              onPageChange={pg.setPage}
              onPageSizeChange={pg.setPageSize}
            />
          </>
        )}
      </div>

      <InvoiceDialog open={!!invoice} onClose={() => setInvoice(null)} data={invoice} />
      <InvoiceEditDialog
        target={editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        onSaved={() => { setEditTarget(null); void refresh(); }}
      />
    </div>
  );
}

export default PurchaseLedgerPage;
