import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AdminSearchBar, matches } from "@/components/admin/AdminSearchBar";



type Req = {
  id: string;
  user_id: string;
  plan_id: string;
  payment_method: string;
  txn_id: string | null;
  proof_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

function RequestsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data: reqs } = await supabase
      .from("subscription_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const list = (reqs as Req[]) ?? [];
    if (list.length) {
      const userIds = [...new Set(list.map((r) => r.user_id))];
      const planIds = [...new Set(list.map((r) => r.plan_id))];
      const [{ data: profiles }, { data: plans }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone").in("id", userIds),
        supabase.from("subscription_plans").select("id,name_bn,price_bdt,duration_days").in("id", planIds),
      ]);
      const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const planMap = new Map((plans ?? []).map((p: any) => [p.id, p]));
      setItems(list.map((r) => ({ ...r, profile: pMap.get(r.user_id), plan: planMap.get(r.plan_id) })));
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((r) =>
        matches(search, r.profile?.full_name, r.profile?.phone, r.txn_id, r.payment_method, r.plan?.name_bn),
      ),
    [items, search],
  );

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  };

  const approve = async (r: any) => {
    const planDays = r.plan?.duration_days ?? 30;
    const expires = new Date(Date.now() + planDays * 86400 * 1000).toISOString();
    const { error: subErr } = await supabase.from("subscriptions").insert({
      user_id: r.user_id,
      plan_id: r.plan_id,
      status: "active",
      starts_at: new Date().toISOString(),
      expires_at: expires,
    });
    if (subErr) return toast.error(subErr.message);
    const { error } = await supabase
      .from("subscription_requests")
      .update({ status: "approved", admin_note: notes[r.id] ?? null })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Approved");
    void load();
  };

  const reject = async (r: any) => {
    const { error } = await supabase
      .from("subscription_requests")
      .update({ status: "rejected", admin_note: notes[r.id] ?? null })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    void load();
  };

  const bulk = async (action: "approve" | "reject") => {
    const targets = filtered.filter((r) => selected.has(r.id));
    if (!targets.length) return;
    const fn = action === "approve" ? approve : reject;
    let ok = 0, fail = 0;
    for (const r of targets) {
      try { await fn(r); ok++; } catch { fail++; }
    }
    setSelected(new Set());
    toast.success(`${ok} ${action}d${fail ? `, ${fail} failed` : ""}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription Requests</h1>
        <p className="text-sm text-muted-foreground">Pending payment proof approval</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdminSearchBar
          value={search}
          onChange={setSearch}
          count={filtered.length}
          placeholder="Phone, txn ID, plan দিয়ে খুঁজুন"
        />
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" onClick={() => bulk("approve")}>
              <Check className="mr-1 h-4 w-4" /> Approve selected
            </Button>
            <Button size="sm" variant="destructive" onClick={() => bulk("reject")}>
              <X className="mr-1 h-4 w-4" /> Reject selected
            </Button>
          </div>
        )}
      </div>
      {filtered.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
          Select all ({filtered.length})
        </label>
      )}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{search ? "কোনো ফলাফল নেই" : "কোন pending request নেই"}</CardContent></Card>
      ) : (
        filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} className="mt-1" />
                  <div>
                    <div className="font-semibold">{r.profile?.full_name ?? "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{r.profile?.phone}</div>
                  </div>
                </div>
                <Badge>{r.payment_method}</Badge>
              </div>
              <div className="text-sm">
                <strong>{r.plan?.name_bn}</strong> — ৳{r.plan?.price_bdt} ({r.plan?.duration_days} days)
              </div>
              {r.txn_id && <div className="text-xs">Txn: <code>{r.txn_id}</code></div>}
              {r.proof_url && (
                <a href={r.proof_url} target="_blank" rel="noopener" className="text-xs text-primary underline">
                  View proof
                </a>
              )}
              <Textarea
                placeholder="Admin note (optional)"
                value={notes[r.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approve(r)}>
                  <Check className="mr-1 h-4 w-4" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => reject(r)}>
                  <X className="mr-1 h-4 w-4" /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default RequestsPage;
