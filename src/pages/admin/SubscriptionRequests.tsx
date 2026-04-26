import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";



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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription Requests</h1>
        <p className="text-sm text-muted-foreground">Pending payment proof approval</p>
      </div>
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">কোন pending request নেই</CardContent></Card>
      ) : (
        items.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{r.profile?.full_name ?? "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{r.profile?.phone}</div>
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
