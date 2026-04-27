import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Phone, RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, Search } from "lucide-react";

type Row = {
  id: string;
  user_id: string;
  plan_id: string | null;
  provider: string | null;
  transaction_id: string | null;
  amount: number | null;
  status: string;
  payment_method: string | null;
  failure_reason: string | null;
  raw_response: any;
  created_at: string;
};

type ProfileLite = { id: string; full_name: string | null; phone: string | null };
type PlanLite = { id: string; name_en: string; name_bn: string };

const STATUS_FILTERS = [
  { v: "all", label: "All" },
  { v: "failed", label: "Failed" },
  { v: "pending", label: "Pending" },
  { v: "completed", label: "Completed" },
] as const;

function StatusBadge({ s }: { s: string }) {
  if (s === "completed") return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20"><CheckCircle2 className="mr-1 h-3 w-3" />Completed</Badge>;
  if (s === "pending") return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
  if (s === "failed") return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/20"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

export default function PaymentAttempts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [plans, setPlans] = useState<Record<string, PlanLite>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("failed");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("payment_transactions")
      .select("id,user_id,plan_id,provider,transaction_id,amount,status,payment_method,failure_reason,raw_response,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data: txs } = await q;
    const list = (txs as Row[] | null) ?? [];
    setRows(list);

    const userIds = Array.from(new Set(list.map((r) => r.user_id))).filter(Boolean);
    const planIds = Array.from(new Set(list.map((r) => r.plan_id).filter(Boolean) as string[]));
    const [{ data: profs }, { data: pl }] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id,full_name,phone").in("id", userIds)
        : Promise.resolve({ data: [] as ProfileLite[] }),
      planIds.length
        ? supabase.from("subscription_plans").select("id,name_en,name_bn").in("id", planIds)
        : Promise.resolve({ data: [] as PlanLite[] }),
    ]);
    const pm: Record<string, ProfileLite> = {};
    (profs as ProfileLite[] | null)?.forEach((p) => { pm[p.id] = p; });
    setProfiles(pm);
    const plm: Record<string, PlanLite> = {};
    (pl as PlanLite[] | null)?.forEach((p) => { plm[p.id] = p; });
    setPlans(plm);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [statusFilter]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const p = profiles[r.user_id];
      return (
        p?.full_name?.toLowerCase().includes(s) ||
        p?.phone?.toLowerCase().includes(s) ||
        r.transaction_id?.toLowerCase().includes(s) ||
        r.failure_reason?.toLowerCase().includes(s)
      );
    });
  }, [rows, profiles, search]);

  const failedLast7d = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    return rows.filter((r) => r.status === "failed" && new Date(r.created_at).getTime() > cutoff).length;
  }, [rows]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-extrabold">Payment Attempts</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            All online payment attempts (Recharge Server). Use the Phone button to follow up on failed attempts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1.5">
            <AlertTriangle className="mr-1 h-3 w-3 text-amber-500" />
            {failedLast7d} failed (7d)
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, TxnID, reason..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs font-semibold uppercase">
            <tr>
              <th className="px-3 py-2.5">When</th>
              <th className="px-3 py-2.5">User</th>
              <th className="px-3 py-2.5">Plan</th>
              <th className="px-3 py-2.5">Amount</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">TxnID</th>
              <th className="px-3 py-2.5">Method</th>
              <th className="px-3 py-2.5">Reason</th>
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">No attempts.</td></tr>
            ) : filtered.map((r) => {
              const p = profiles[r.user_id];
              const plan = r.plan_id ? plans[r.plan_id] : null;
              return (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold">{p?.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{p?.phone || "—"}</div>
                  </td>
                  <td className="px-3 py-2.5">{plan?.name_en || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold">৳ {r.amount ?? 0}</td>
                  <td className="px-3 py-2.5"><StatusBadge s={r.status} /></td>
                  <td className="px-3 py-2.5 text-xs"><code className="font-mono">{r.transaction_id || "—"}</code></td>
                  <td className="px-3 py-2.5 text-xs">{r.payment_method || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.failure_reason || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {p?.phone ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={`tel:${p.phone}`}><Phone className="mr-1 h-3.5 w-3.5" />Call</a>
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}