import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@/lib/router";
import { PageHeader } from "@/components/app/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  pending: "bg-amber-100 text-amber-700",
  copied: "bg-blue-100 text-blue-700",
};

export default function SmsHistoryPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data: rows = [], isFetching, refetch } = useQuery({
    queryKey: ["sms_history", current?.id, status],
    enabled: !!current?.id,
    queryFn: async () => {
      let qb = supabase.from("sms_history").select("*").eq("shop_id", current!.id).order("created_at", { ascending: false }).limit(500);
      if (status !== "all") qb = qb.eq("status", status);
      const { data } = await qb;
      return data ?? [];
    },
  });

  const filtered = rows.filter((r: any) => {
    const ql = q.trim().toLowerCase();
    if (!ql) return true;
    return (r.recipient_phone ?? "").includes(ql) || (r.recipient_name ?? "").toLowerCase().includes(ql);
  });

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={lang === "bn" ? "SMS হিস্টোরি" : "SMS History"}
        title={
          <span className="flex items-center gap-2">
            <button onClick={() => nav({ to: "/app/marketing" })} className="-ml-1 flex h-7 w-7 items-center justify-center rounded hover:bg-accent" aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>
            {lang === "bn" ? "SMS হিস্টোরি" : "SMS History"}
          </span>
        }
      />
      <div className="container px-3 py-4 sm:px-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "bn" ? "নাম বা ফোন দিয়ে খুঁজুন" : "Search name or phone"} className="h-10 pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="copied">Copied</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => refetch()}>
            <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />
          </Button>
        </div>

        <div className="rounded-xl border bg-background">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">{lang === "bn" ? "কোনো SMS হিস্টোরি নেই" : "No SMS history yet"}</div>
          ) : (
            <div className="divide-y">
              {filtered.map((r: any) => (
                <div key={r.id} className="flex flex-wrap items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.recipient_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">{r.recipient_phone}</span>
                      <span className={"rounded px-1.5 py-0.5 text-xs font-medium " + (STATUS_COLORS[r.status] ?? "bg-muted")}>{r.status}</span>
                      {r.template_code && <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.template_code}</span>}
                      <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("bn-BD")}</span>
                    </div>
                    <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{r.message}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{r.sms_count} SMS{r.error ? ` • ${r.error}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}