import { useNavigate } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, ArrowLeft, MoreVertical, Printer, Eye, Trash2, Download, RefreshCw, Search, Calendar, Pencil, Undo2, RotateCcw } from "lucide-react";
import { BadgePercent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { salesListQuery, contactsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PeriodStepper, rangeOf, todayAnchor, type PeriodState } from "@/components/app/PeriodStepper";
import { EmptyState } from "@/components/app/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceDialog, type InvoiceData } from "@/components/app/InvoiceDialog";
import { InvoiceEditDialog, type InvoiceEditTarget } from "@/components/app/InvoiceEditDialog";
import { DueDiscountDialog, type DueDiscountSale } from "@/components/app/DueDiscountDialog";
import { PartialReturnDialog } from "@/components/app/PartialReturnDialog";
import { createInstantReturn } from "@/lib/instant-return";
import { DataPagination } from "@/components/app/DataPagination";
import { usePagination } from "@/hooks/use-pagination";
import { toast } from "sonner";
import { printTableReport } from "@/lib/print-report";
import { usePermissions } from "@/lib/permissions-hook";

type Sale = {
  id: string;
  invoice_no: string | null;
  customer_id: string | null;
  shop_id?: string;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  payment_method: string;
  note: string | null;
  created_at: string;
};



function SalesLedgerPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { isOwner, isAdmin } = usePermissions();
  const canDelete = isOwner || isAdmin;
  const { data: rawSales, refetch } = useQuery(salesListQuery(current?.id ?? null));
  const sales = useMemo(() => (rawSales as unknown as Sale[] | undefined) ?? [], [rawSales]);
  const { data: customersData } = useQuery(contactsQuery(current?.id ?? null, "customers"));
  const customers = useMemo(() => customersData ?? [], [customersData]);
  const custMap = useMemo(
    () => Object.fromEntries(
      (customers as { id: string; name: string; phone: string | null }[])
        .map((c) => [c.id, c])
    ),
    [customers]
  );

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "due">("all");
  const [period, setPeriod] = useState<PeriodState>({ mode: "month", anchor: todayAnchor() });
  const { start: from, end: to } = useMemo(() => rangeOf(period), [period]);

  const salesIdsKey = useMemo(() => sales.map((s) => s.id).join(","), [sales]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [returnedSet, setReturnedSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!salesIdsKey) { setItemCounts({}); return; }
    let cancel = false;
    (async () => {
      const ids = salesIdsKey.split(",");
      const { data } = await supabase
        .from("sale_items")
        .select("sale_id")
        .in("sale_id", ids);
      if (cancel) return;
      const counts: Record<string, number> = {};
      ((data as { sale_id: string }[]) ?? []).forEach((r) => {
        counts[r.sale_id] = (counts[r.sale_id] ?? 0) + 1;
      });
      setItemCounts(counts);
    })();
    return () => { cancel = true; };
  }, [salesIdsKey]);

  useEffect(() => {
    if (!salesIdsKey) { setReturnedSet(new Set()); return; }
    let cancel = false;
    (async () => {
      const ids = salesIdsKey.split(",");
      const { data } = await supabase
        .from("sale_returns")
        .select("sale_id")
        .in("sale_id", ids)
        .is("deleted_at", null);
      if (cancel) return;
      const s = new Set<string>();
      ((data as { sale_id: string | null }[]) ?? []).forEach((r) => { if (r.sale_id) s.add(r.sale_id); });
      setReturnedSet(s);
    })();
    return () => { cancel = true; };
  }, [salesIdsKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = new Date(from + "T00:00:00").getTime();
    const toTs = new Date(to + "T23:59:59").getTime();
    return sales.filter((s) => {
      const t = new Date(s.created_at).getTime();
      if (t < fromTs || t > toTs) return false;
      if (paymentFilter === "cash" && Number(s.due) > 0) return false;
      if (paymentFilter === "due" && Number(s.due) === 0) return false;
      if (!q) return true;
      const c = custMap[s.customer_id ?? ""];
      return (s.invoice_no ?? "").toLowerCase().includes(q)
        || (c?.name ?? "").toLowerCase().includes(q)
        || (c?.phone ?? "").toLowerCase().includes(q);
    });
  }, [sales, search, custMap, from, to, paymentFilter]);

  const totalAmount = useMemo(() => filtered.reduce((a, s) => a + Number(s.total), 0), [filtered]);
  const pg = usePagination(filtered, 25);

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["sales"] }); await refetch(); };

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [discountSale, setDiscountSale] = useState<DueDiscountSale | null>(null);
  const [editTarget, setEditTarget] = useState<InvoiceEditTarget | null>(null);
  const [partialReturnSale, setPartialReturnSale] = useState<{ id: string; invoice_no: string | null } | null>(null);

  const doInstantReturn = async (s: Sale) => {
    if (!current?.id) return;
    const msg = lang === "bn"
      ? `এই invoice এর সব পণ্য ফেরত নেওয়া হবে এবং স্টকে ফিরে যাবে — নিশ্চিত?`
      : `Return ALL items of this invoice and restock — confirm?`;
    if (!confirm(msg)) return;
    try {
      await createInstantReturn({ shopId: current.id, saleId: s.id, refundMethod: Number(s.due) > 0 ? "due_adjust" : "cash" });
      toast.success(lang === "bn" ? "ফেরত সম্পন্ন" : "Return completed");
      void refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const openInvoice = async (s: Sale) => {
    const { data: items } = await supabase
      .from("sale_items")
      .select("name,qty,price,total")
      .eq("sale_id", s.id);
    const c = custMap[s.customer_id ?? ""];
    setInvoice({
      mode: "sell",
      shop: {
        name: current?.name ?? "",
        address: (current as { address?: string | null } | null)?.address ?? null,
        phone: (current as { phone?: string | null } | null)?.phone ?? null,
        logo_url: (current as { logo_url?: string | null } | null)?.logo_url ?? null,
      },
      party: { name: c?.name ?? null, phone: c?.phone ?? null, address: null },
      invoiceNo: s.invoice_no ?? s.id.slice(0, 12).toUpperCase(),
      date: s.created_at,
      items: ((items as { name: string; qty: number; price: number; total: number }[]) ?? []).map((it) => ({
        name: it.name, qty: Number(it.qty), price: Number(it.price), total: Number(it.total),
      })),
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      delivery: 0,
      grandTotal: Number(s.total),
      paid: Number(s.paid),
      previousDue: 0,
      currentDue: Number(s.due),
    });
  };

  const softDelete = async (s: Sale) => {
    if (!confirm(t("p5_Delete_this_sale"))) return;
    const { error } = await supabase
      .from("sales")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("p5_Deleted"));
    void refresh();
  };

  const printAll = () => {
    printTableReport({
      shopName: current?.name ?? "",
      shopAddress: (current as { address?: string | null } | null)?.address ?? null,
      shopPhone: (current as { phone?: string | null } | null)?.phone ?? null,
      title: t("p5_Transaction_History"),
      startDate: from,
      endDate: to,
      lang,
      columns: [
        { key: "idx", label: "#" },
        { key: "name", label: t("p5_Name") },
        { key: "contact", label: t("p5_Contact") },
        { key: "items", label: t("p5_Items"), align: "right" },
        { key: "amount", label: t("p5_Amount"), align: "right" },
        { key: "date", label: t("p5_Date") },
        { key: "status", label: t("p5_Payment_Status") },
      ],
      rows: filtered.map((s, i) => {
        const c = custMap[s.customer_id ?? ""];
        const due = Number(s.due);
        return {
          idx: String(i + 1),
          name: c?.name ?? "—",
          contact: c?.phone ?? "—",
          items: itemCounts[s.id] ?? 0,
          amount: fmtMoney(Number(s.total), lang),
          date: fmtDate(s.created_at),
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
      <div className="mb-1 text-xs text-muted-foreground">Sales Book</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-extrabold md:text-2xl">{t("p5_Sales_Book")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={printAll} className="h-10 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="h-4 w-4" />
            {t("p5_Download_Print")}
          </Button>
          <div className="rounded-md border bg-card px-3 py-2 text-sm font-semibold">
            {t("p5_Total_6")}{fmtMoney(totalAmount, lang)}
          </div>
          <Button variant="outline" className="h-10 gap-2" onClick={() => nav({ to: "/app/sell" })}>
            <Plus className="h-4 w-4" />
            {t("p5_New")}
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
        <PeriodStepper value={period} onChange={setPeriod} lang={lang === "bn" ? "bn" : "en"} />
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
          <EmptyState icon={<FileText className="h-6 w-6" />} title={t("p5_No_sales")} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("p5_Contact_2")}</TableHead>
                  <TableHead>{t("p5_Invoice_no")}</TableHead>
                  <TableHead>{t("p5_Items")}</TableHead>
                  <TableHead>{t("p5_Amount_3")}</TableHead>
                  <TableHead>{t("p5_Date")}</TableHead>
                  <TableHead>{t("p5_Payment")}</TableHead>
                  <TableHead className="text-right print:hidden">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.paged.map((s) => {
                  const c = custMap[s.customer_id ?? ""];
                  const isPaid = Number(s.due) === 0;
                  return (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => void openInvoice(s)}
                    >
                      <TableCell>
                        <div className="font-medium">{c?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{c?.phone ?? "---"}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.invoice_no ?? s.id.slice(0, 12).toUpperCase()}</TableCell>
                      <TableCell>
                        <div>{lang === "bn" ? bnNum(itemCounts[s.id] ?? 0) : (itemCounts[s.id] ?? 0)}</div>
                        {s.note && (
                          <div className="text-[10px] text-muted-foreground">{s.note}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{fmtMoney(Number(s.total), lang)}</TableCell>
                      <TableCell className="text-xs">{fmtDate(s.created_at)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {isPaid ? (t("p5_Cash_2")) : (t("p5_Due_2"))}
                        </span>
                        {returnedSet.has(s.id) && (
                          <span className="ml-1 inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                            {lang === "bn" ? "ফেরত" : "Returned"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right print:hidden" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void openInvoice(s)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t("p5_View_Print_invoice")}
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem onClick={() => setEditTarget({ kind: "sale", id: s.id, shopId: current?.id ?? "" })}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("p5_Edit_invoice")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => void openInvoice(s)}>
                              <Printer className="mr-2 h-4 w-4" />
                              {t("p5_Print")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void doInstantReturn(s)} disabled={returnedSet.has(s.id)}>
                              <Undo2 className="mr-2 h-4 w-4" />
                              {lang === "bn" ? "সম্পূর্ণ ফেরত" : "Full return"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPartialReturnSale({ id: s.id, invoice_no: s.invoice_no })} disabled={returnedSet.has(s.id)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              {lang === "bn" ? "আংশিক ফেরত" : "Partial return"}
                            </DropdownMenuItem>
                            {Number(s.due) > 0 && (
                              <DropdownMenuItem onClick={() => setDiscountSale({
                                id: s.id,
                                shop_id: current?.id ?? "",
                                customer_id: s.customer_id,
                                total: Number(s.total),
                                discount: Number(s.discount),
                                due: Number(s.due),
                              })}>
                                <BadgePercent className="mr-2 h-4 w-4" />
                                {t("p5_Apply_discount")}
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem className="text-rose-600" onClick={() => void softDelete(s)}>
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
      <DueDiscountDialog
        open={!!discountSale}
        onOpenChange={(o) => !o && setDiscountSale(null)}
        sale={discountSale}
        onApplied={() => void refresh()}
      />
      <PartialReturnDialog
        open={!!partialReturnSale}
        onOpenChange={(o) => !o && setPartialReturnSale(null)}
        shopId={current?.id ?? ""}
        saleId={partialReturnSale?.id ?? null}
        invoiceNo={partialReturnSale?.invoice_no ?? null}
        onDone={() => { setPartialReturnSale(null); void refresh(); }}
      />
    </div>
  );
}

export default SalesLedgerPage;
