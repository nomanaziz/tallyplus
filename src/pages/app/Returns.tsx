import { useNavigate, Link } from "@/lib/router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { RequirePerm } from "@/components/app/RequirePerm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/app/EmptyState";
import { Plus, Search, Eye, Trash2, Undo2, Download, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { printTableReport } from "@/lib/print-report";



type ReturnRow = {
  id: string;
  return_no: string | null;
  customer_id: string | null;
  reason: string | null;
  total: number;
  refund_amount: number;
  refund_status: string;
  refund_method: string;
  created_at: string;
};

function ReturnsListPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "refunded" | "adjusted_to_due">("all");

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["returns", "list", current?.id],
    enabled: !!current?.id,
    queryFn: async () => {
      if (!current?.id) return [] as ReturnRow[];
      const { data, error } = await supabase
        .from("sale_returns")
        .select("id,return_no,customer_id,reason,total,refund_amount,refund_status,refund_method,created_at")
        .eq("shop_id", current.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ReturnRow[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["returns-customers", current?.id],
    enabled: !!current?.id,
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id,name,phone").eq("shop_id", current!.id).is("deleted_at", null);
      return (data ?? []) as { id: string; name: string; phone: string | null }[];
    },
  });
  const custMap = useMemo(() => Object.fromEntries((customers ?? []).map((c) => [c.id, c])), [customers]);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.refund_status !== statusFilter) return false;
      if (!s) return true;
      const cust = r.customer_id ? custMap[r.customer_id] : null;
      return (
        (r.return_no ?? "").toLowerCase().includes(s) ||
        (r.reason ?? "").toLowerCase().includes(s) ||
        (cust?.name ?? "").toLowerCase().includes(s) ||
        (cust?.phone ?? "").toLowerCase().includes(s)
      );
    });
  }, [data, search, statusFilter, custMap]);

  const totals = useMemo(() => {
    const rows = filtered;
    return {
      count: rows.length,
      value: rows.reduce((a, r) => a + Number(r.total ?? 0), 0),
      refunded: rows.filter((r) => r.refund_status === "refunded").reduce((a, r) => a + Number(r.refund_amount ?? 0), 0),
      pending: rows.filter((r) => r.refund_status === "pending").reduce((a, r) => a + Number(r.refund_amount ?? 0), 0),
    };
  }, [filtered]);

  async function onDelete(id: string) {
    if (!confirm(lang === "bn" ? "এই রিটার্নটি মুছবেন?" : "Delete this return?")) return;
    const { error } = await supabase.from("sale_returns").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "রিটার্ন মোছা হয়েছে" : "Return deleted");
    refetch();
  }

  function buildExportRows() {
    return filtered.map((r) => {
      const cust = r.customer_id ? custMap[r.customer_id] : null;
      return {
        date: new Date(r.created_at).toLocaleDateString("en-GB"),
        return_no: r.return_no ?? r.id.slice(0, 6),
        customer: cust?.name ?? (lang === "bn" ? "ওয়াক-ইন" : "Walk-in"),
        reason: r.reason ?? "—",
        total: fmtMoney(Number(r.total ?? 0), lang),
        refund: fmtMoney(Number(r.refund_amount ?? 0), lang),
        status: r.refund_status,
      };
    });
  }

  function handleDownload() {
    if (filtered.length === 0) {
      toast.error(lang === "bn" ? "ডাউনলোড করার মতো কিছু নেই" : "Nothing to download");
      return;
    }
    const headers = ["Date", "Return No", "Customer", "Reason", "Total", "Refund", "Status"];
    const rows = buildExportRows().map((r) => [r.date, r.return_no, r.customer, r.reason, r.total, r.refund, r.status]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-returns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint(asReport: boolean) {
    if (filtered.length === 0) {
      toast.error(lang === "bn" ? "প্রিন্ট করার মতো কিছু নেই" : "Nothing to print");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const dates = filtered.map((r) => r.created_at).sort();
    const start = dates.length ? new Date(dates[0]).toISOString().slice(0, 10) : today;
    const end = dates.length ? new Date(dates[dates.length - 1]).toISOString().slice(0, 10) : today;
    const exportRows = buildExportRows();
    const footer = asReport
      ? `${lang === "bn" ? "মোট রিটার্ন" : "Total returns"}: ${totals.count}  •  ${lang === "bn" ? "মোট মূল্য" : "Total"}: ${fmtMoney(totals.value, lang)}  •  ${lang === "bn" ? "ফেরত" : "Refunded"}: ${fmtMoney(totals.refunded, lang)}  •  ${lang === "bn" ? "অপেক্ষমান" : "Pending"}: ${fmtMoney(totals.pending, lang)}`
      : undefined;
    printTableReport({
      shopName: current?.name ?? "",
      shopAddress: (current as { address?: string | null } | null)?.address ?? null,
      shopPhone: (current as { phone?: string | null } | null)?.phone ?? null,
      title: lang === "bn"
        ? (asReport ? "প্রোডাক্ট রিটার্ন রিপোর্ট" : "প্রোডাক্ট রিটার্ন")
        : (asReport ? "Product Return Report" : "Product Returns"),
      startDate: start,
      endDate: end,
      lang,
      columns: [
        { key: "date", label: lang === "bn" ? "তারিখ" : "Date" },
        { key: "return_no", label: lang === "bn" ? "রিটার্ন নং" : "Return No" },
        { key: "customer", label: lang === "bn" ? "কাস্টমার" : "Customer" },
        { key: "reason", label: lang === "bn" ? "কারণ" : "Reason" },
        { key: "total", label: lang === "bn" ? "মোট" : "Total", align: "right" },
        { key: "refund", label: lang === "bn" ? "ফেরত" : "Refund", align: "right" },
        { key: "status", label: lang === "bn" ? "অবস্থা" : "Status" },
      ],
      rows: exportRows,
      footer,
    });
  }

  const statusBadge = (s: string) => {
    if (s === "refunded") return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{lang === "bn" ? "ফেরত দেওয়া" : "Refunded"}</span>;
    if (s === "adjusted_to_due") return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{lang === "bn" ? "বাকিতে সমন্বয়" : "Adjusted"}</span>;
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{lang === "bn" ? "অপেক্ষমান" : "Pending"}</span>;
  };

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={lang === "bn" ? "প্রোডাক্ট রিটার্ন" : "Product Return"}
        title={lang === "bn" ? "প্রোডাক্ট রিটার্ন" : "Product Return"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              <span className="ml-1 text-xs">{lang === "bn" ? "ডাউনলোড" : "Download"}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePrint(true)}>
              <FileText className="h-4 w-4" />
              <span className="ml-1 text-xs">{lang === "bn" ? "রিপোর্ট" : "Report"}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePrint(false)}>
              <Printer className="h-4 w-4" />
              <span className="ml-1 text-xs">{lang === "bn" ? "প্রিন্ট" : "Print"}</span>
            </Button>
            <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90" onClick={() => nav({ to: "/app/returns/new" })}>
              <Plus className="h-4 w-4" />
              <span className="ml-1 text-xs">{lang === "bn" ? "নতুন রিটার্ন" : "New return"}</span>
            </Button>
          </div>
        }
      />

      <div className="container space-y-3 px-3 py-3 md:space-y-4 md:px-4 md:py-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          <Tile label={lang === "bn" ? "মোট রিটার্ন" : "Total returns"} value={String(totals.count)} />
          <Tile label={lang === "bn" ? "রিটার্ন মূল্য" : "Return value"} value={fmtMoney(totals.value, lang)} tone="primary" />
          <Tile label={lang === "bn" ? "টাকা ফেরত" : "Refunded"} value={fmtMoney(totals.refunded, lang)} tone="danger" />
          <Tile label={lang === "bn" ? "অপেক্ষমান" : "Pending"} value={fmtMoney(totals.pending, lang)} tone="warn" />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 rounded-xl border bg-background p-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder={lang === "bn" ? "রিটার্ন নং, কারণ, কাস্টমার…" : "Return no, reason, customer…"} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "bn" ? "সব স্ট্যাটাস" : "All statuses"}</SelectItem>
              <SelectItem value="pending">{lang === "bn" ? "অপেক্ষমান" : "Pending"}</SelectItem>
              <SelectItem value="refunded">{lang === "bn" ? "ফেরত দেওয়া" : "Refunded"}</SelectItem>
              <SelectItem value="adjusted_to_due">{lang === "bn" ? "বাকিতে সমন্বয়" : "Adjusted to due"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="rounded-xl border bg-background">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Undo2 className="h-8 w-8" />}
              title={lang === "bn" ? "এখনো কোনো রিটার্ন নেই" : "No returns yet"}
              action={<Button onClick={() => nav({ to: "/app/returns/new" })}><Plus className="mr-1 h-4 w-4" />{lang === "bn" ? "নতুন রিটার্ন" : "New return"}</Button>}
            />
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => {
                const cust = r.customer_id ? custMap[r.customer_id] : null;
                return (
                  <li key={r.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                      <Undo2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-bold">{r.return_no ?? r.id.slice(0, 6)}</div>
                        {statusBadge(r.refund_status)}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {cust?.name ?? (lang === "bn" ? "ওয়াক-ইন" : "Walk-in")}
                        {r.reason ? ` · ${r.reason}` : ""}
                        {" · "}{new Date(r.created_at).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-extrabold">{fmtMoney(r.total, lang)}</div>
                      <div className="text-[11px] text-muted-foreground">{lang === "bn" ? "ফেরত: " : "Refund: "}{fmtMoney(r.refund_amount, lang)}</div>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-1">
                      <Link to="/app/returns/$id" params={{ id: r.id }}>
                        <Button size="icon" variant="ghost" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => onDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "primary" | "danger" | "warn" }) {
  const color =
    tone === "primary" ? "text-primary"
    : tone === "danger" ? "text-rose-600"
    : tone === "warn" ? "text-amber-600"
    : "text-foreground";
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="text-[11px] font-bold text-muted-foreground">{label}</div>
      <div className={"mt-0.5 text-base font-extrabold md:text-xl " + color}>{value}</div>
    </div>
  );
}
export default ReturnsListPage;
