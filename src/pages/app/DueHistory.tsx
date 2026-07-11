import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, Download, RefreshCw } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/app/DateRangePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";
import { printTableReport } from "@/lib/print-report";
import { DataPagination } from "@/components/app/DataPagination";
import { usePagination } from "@/hooks/use-pagination";

type PaymentRow = {
  id: string;
  customer_id: string | null;
  supplier_id: string | null;
  direction: string;
  amount: number;
  method: string;
  note: string | null;
  created_at: string;
};

type Contact = { id: string; name: string; phone: string | null };

function DueHistoryPage() {
  const { lang, t } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(todayIso);
  const [to, setTo] = useState(todayIso);
  const [perPage, setPerPage] = useState(10);
  const [refreshTick, setRefreshTick] = useState(0);

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [customers, setCustomers] = useState<Record<string, Contact>>({});
  const [suppliers, setSuppliers] = useState<Record<string, Contact>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!current?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const fromTs = new Date(from + "T00:00:00").toISOString();
      const toTs = new Date(to + "T23:59:59").toISOString();
      const { data } = await supabase
        .from("payments")
        .select("id,customer_id,supplier_id,direction,amount,method,note,created_at")
        .eq("shop_id", current.id)
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const list = (data ?? []) as PaymentRow[];
      setRows(list);

      const custIds = Array.from(new Set(list.map((r) => r.customer_id).filter(Boolean) as string[]));
      const supIds = Array.from(new Set(list.map((r) => r.supplier_id).filter(Boolean) as string[]));
      const [{ data: cs }, { data: ss }] = await Promise.all([
        custIds.length
          ? supabase.from("customers").select("id,name,phone").in("id", custIds)
          : Promise.resolve({ data: [] as Contact[] }),
        supIds.length
          ? supabase.from("suppliers").select("id,name,phone").in("id", supIds)
          : Promise.resolve({ data: [] as Contact[] }),
      ]);
      if (cancelled) return;
      setCustomers(Object.fromEntries((cs ?? []).map((c) => [c.id, c as Contact])));
      setSuppliers(Object.fromEntries((ss ?? []).map((s) => [s.id, s as Contact])));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.id, from, to, refreshTick]);

  type View = {
    id: string;
    name: string;
    phone: string | null;
    type: "customer" | "supplier";
    amount: number;
    direction: string;
    created_at: string;
  };

  const view: View[] = useMemo(() => {
    return rows.map((r) => {
      if (r.customer_id) {
        const c = customers[r.customer_id];
        return {
          id: r.id,
          name: c?.name ?? "—",
          phone: c?.phone ?? null,
          type: "customer",
          amount: Number(r.amount),
          direction: r.direction,
          created_at: r.created_at,
        };
      }
      const s = r.supplier_id ? suppliers[r.supplier_id] : null;
      return {
        id: r.id,
        name: s?.name ?? "—",
        phone: s?.phone ?? null,
        type: "supplier",
        amount: Number(r.amount),
        direction: r.direction,
        created_at: r.created_at,
      };
    });
  }, [rows, customers, suppliers]);

  const pg = usePagination(view, perPage);

  const fmtDateTime = (iso: string) => {
    const d = new Date(iso);
    const s = d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return lang === "bn" ? bnNum(s) : s;
  };

  const statusLabel = (direction: string) => {
    // payments.direction is "in" (received) or "out" (paid)
    if (direction === "in") return t("p5_Received");
    if (direction === "out") return t("p5_Paid_5");
    return direction;
  };

  const handlePrint = () => {
    printTableReport({
      shopName: current?.name ?? "",
      shopAddress: (current as { address?: string | null } | null)?.address ?? null,
      shopPhone: (current as { phone?: string | null } | null)?.phone ?? null,
      title: t("p5_Due_History"),
      startDate: from,
      endDate: to,
      lang,
      columns: [
        { key: "idx", label: "#" },
        { key: "name", label: t("p5_Contact_Name") },
        { key: "phone", label: t("p5_Phone") },
        { key: "type", label: t("p5_Contact_Type") },
        { key: "amount", label: t("p5_Amount"), align: "right" },
        { key: "status", label: t("p5_Status") },
        { key: "date", label: t("p5_Date_Time") },
      ],
      rows: view.map((v, i) => ({
        idx: String(i + 1),
        name: v.name,
        phone: v.phone ?? "—",
        type: v.type === "customer" ? (t("p5_Customer")) : t("p5_Supplier"),
        amount: fmtMoney(v.amount, lang),
        status: statusLabel(v.direction),
        date: fmtDateTime(v.created_at),
      })),
    });
  };

  return (
    <div className="container px-4 py-4">
      <div className="mb-1 text-xs text-muted-foreground">
        <button className="hover:underline" onClick={() => nav({ to: "/app/due-ledger" })}>
          {t("p5_Due_2")}
        </button>
        {" / "}
        <span className="text-foreground">{t("p5_Due_History")}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nav({ to: "/app/due-ledger" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-extrabold md:text-2xl">{t("p5_Due_History")}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handlePrint} className="h-10 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="h-4 w-4" />
            {t("p5_Download_Print")}
          </Button>
          <DateRangePicker
            value={{ start: from, end: to }}
            onChange={(v) => { setFrom(v.start); setTo(v.end); }}
          />
          <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
            <SelectTrigger className="h-10 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="h-10 gap-2" onClick={() => setRefreshTick((t) => t + 1)}>
            <RefreshCw className="h-4 w-4" />
            {t("p5_Refresh")}
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("p5_Contact_Name")}</TableHead>
              <TableHead>{t("p5_Phone")}</TableHead>
              <TableHead>{t("p5_Contact_Type")}</TableHead>
              <TableHead className="text-right">{t("p5_Amount")}</TableHead>
              <TableHead>{t("p5_Status")}</TableHead>
              <TableHead>{t("p5_Date_Time")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pg.paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {loading
                    ? "..."
                    : lang === "bn"
                    ? "১ থেকে ০ এর মধ্যে ০ লেনদেন দেখানো হচ্ছে"
                    : `Showing 1 to 0 of 0 Transactions`}
                </TableCell>
              </TableRow>
            ) : (
              pg.paged.map((v: View) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {v.type === "customer"
                        ? t("p5_Customer")
                        : t("p5_Supplier")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(v.amount, lang)}</TableCell>
                  <TableCell>
                    <Badge variant={v.direction === "in" ? "default" : "secondary"}>{statusLabel(v.direction)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtDateTime(v.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {pg.paged.length > 0 && (
          <div className="border-t p-2">
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
          </div>
        )}
      </div>
    </div>
  );
}

export default DueHistoryPage;