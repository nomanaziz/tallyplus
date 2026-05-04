import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  shop_id: string;
  from_user_id: string;
  to_user_id: string | null;
  to_phone: string | null;
  reason: string | null;
  charge_amount: number;
  payment_proof_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  shops?: { name: string | null } | null;
};

const STATUS_TONE: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  pending_recipient: "bg-blue-100 text-blue-800",
  pending_admin: "bg-purple-100 text-purple-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected_admin: "bg-rose-100 text-rose-800",
  rejected_recipient: "bg-rose-100 text-rose-800",
};

export default function AdminTransfers() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_transfer_requests")
        .select("*, shops(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const act = async (id: string, action: "verify_payment" | "approve" | "reject") => {
    setBusy(id + action);
    const { data, error } = await supabase.rpc("admin_decide_shop_transfer", {
      _id: id,
      _action: action,
      _notes: notes[id] ?? null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean; error?: string } | null;
    if (!res?.ok) return toast.error(res?.error ?? "Failed");
    toast.success("Done");
    qc.invalidateQueries({ queryKey: ["admin-transfers"] });
  };

  const rows = q.data ?? [];
  const pending = rows.filter((r) => r.status.startsWith("pending"));
  const done = rows.filter((r) => !r.status.startsWith("pending"));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Shop Ownership Transfers</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">দোকানের মালিকানা হস্তান্তরের অনুরোধ</p>
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <Section title={`Pending (${pending.length})`}>
            {pending.length === 0 ? (
              <Empty>No pending transfers</Empty>
            ) : (
              pending.map((r) => (
                <RowCard key={r.id} r={r} notes={notes[r.id] ?? ""} setNotes={(v) => setNotes((s) => ({ ...s, [r.id]: v }))} act={act} busy={busy} />
              ))
            )}
          </Section>

          <Section title={`History (${done.length})`}>
            {done.length === 0 ? <Empty>No history</Empty> : done.map((r) => <RowCard key={r.id} r={r} readOnly />)}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="p-3 sm:p-4"><CardTitle className="text-sm font-semibold">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3 p-3 pt-0 sm:p-4 sm:pt-0">{children}</CardContent>
    </Card>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-xs text-muted-foreground">{children}</div>;
}

function RowCard({
  r, notes, setNotes, act, busy, readOnly,
}: {
  r: Row;
  notes?: string;
  setNotes?: (v: string) => void;
  act?: (id: string, action: "verify_payment" | "approve" | "reject") => void;
  busy?: string | null;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">{r.shops?.name ?? "Shop"}</div>
          <div className="text-xs text-muted-foreground">
            To: {r.to_phone || r.to_user_id} • Charge ৳{r.charge_amount} • {new Date(r.created_at).toLocaleString()}
          </div>
          {r.reason && <div className="mt-1 text-xs">Reason: {r.reason}</div>}
          {r.admin_notes && <div className="mt-1 text-xs text-muted-foreground">Admin note: {r.admin_notes}</div>}
        </div>
        <Badge className={STATUS_TONE[r.status] ?? ""}>{r.status}</Badge>
      </div>
      {r.payment_proof_url && (
        <a href={r.payment_proof_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
          <ExternalLink className="h-3 w-3" /> Payment proof
        </a>
      )}
      {!readOnly && act && setNotes && (
        <div className="mt-3 space-y-2">
          <Textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} placeholder="Admin notes (optional)" rows={2} />
          <div className="flex flex-wrap gap-2">
            {r.status === "pending_payment" && (
              <Button size="sm" onClick={() => act(r.id, "verify_payment")} disabled={busy === r.id + "verify_payment"}>
                {busy === r.id + "verify_payment" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Verify Payment
              </Button>
            )}
            {r.status === "pending_admin" && (
              <Button size="sm" onClick={() => act(r.id, "approve")} disabled={busy === r.id + "approve"}>
                {busy === r.id + "approve" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Approve
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={() => act(r.id, "reject")} disabled={busy === r.id + "reject"}>
              {busy === r.id + "reject" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}