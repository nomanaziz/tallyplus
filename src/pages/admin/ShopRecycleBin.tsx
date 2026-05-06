import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Snapshot = {
  id: string;
  shop_id: string;
  shop_owner_id: string;
  shop_name: string;
  kind: "reset" | "delete";
  summary: Record<string, number>;
  size_bytes: number;
  status: string;
  created_at: string;
  expires_at: string;
};

type RestoreReq = {
  id: string;
  snapshot_id: string;
  shop_id: string;
  requested_by: string;
  kind: "reset" | "delete";
  merge_mode: "replace" | "merge";
  amount_bdt: number;
  status: string;
  payment_ref: string | null;
  admin_note: string | null;
  created_at: string;
};

type Settings = {
  reset_price_bdt: number;
  delete_price_bdt: number;
  retention_days: number;
  max_resets_per_user: number;
  delete_grace_days: number;
};

const fmtDate = (s: string) => new Date(s).toLocaleString("en-GB");
const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`);

export default function ShopRecycleBinPage() {
  const [tab, setTab] = useState("reset");
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [reqs, setReqs] = useState<RestoreReq[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [decideOn, setDecideOn] = useState<RestoreReq | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, r, st] = await Promise.all([
      supabase.from("shop_snapshots").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("shop_restore_requests").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("shop_restore_settings").select("*").maybeSingle(),
    ]);
    setSnaps((s.data as Snapshot[]) ?? []);
    setReqs((r.data as RestoreReq[]) ?? []);
    setSettings((st.data as Settings) ?? null);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const decide = async (approve: boolean) => {
    if (!decideOn) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_decide_restore", {
        _req_id: decideOn.id,
        _approve: approve,
        _payment_ref: paymentRef || "",
        _note: note || "",
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string };
      if (!res?.ok) { toast.error(res?.error || "failed"); return; }
      toast.success(approve ? "Restored" : "Rejected");
      setDecideOn(null); setPaymentRef(""); setNote("");
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setBusy(true);
    const { error } = await supabase.from("shop_restore_settings").update({
      reset_price_bdt: settings.reset_price_bdt,
      delete_price_bdt: settings.delete_price_bdt,
      retention_days: settings.retention_days,
      max_resets_per_user: settings.max_resets_per_user,
      delete_grace_days: settings.delete_grace_days,
    }).eq("id", true);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const resetSnaps = snaps.filter((s) => s.kind === "reset");
  const deleteSnaps = snaps.filter((s) => s.kind === "delete");

  const SnapTable = ({ rows }: { rows: Snapshot[] }) => (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-left">Shop</th>
            <th className="p-2 text-left">Owner</th>
            <th className="p-2 text-left">Created</th>
            <th className="p-2 text-left">Expires</th>
            <th className="p-2 text-left">Size</th>
            <th className="p-2 text-left">Records</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (<tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No snapshots</td></tr>)}
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2 font-medium">{r.shop_name}</td>
              <td className="p-2 font-mono text-xs">{r.shop_owner_id.slice(0, 8)}…</td>
              <td className="p-2 text-xs">{fmtDate(r.created_at)}</td>
              <td className="p-2 text-xs">{fmtDate(r.expires_at)}</td>
              <td className="p-2">{fmtSize(r.size_bytes)}</td>
              <td className="p-2 text-xs">{Object.entries(r.summary || {}).map(([k, v]) => `${k}:${v}`).join(", ")}</td>
              <td className="p-2"><span className="rounded bg-muted px-2 py-0.5 text-xs">{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trash2 className="h-6 w-6" /> Shop Recycle Bin</h1>
        <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reset">Reset Snapshots ({resetSnaps.length})</TabsTrigger>
          <TabsTrigger value="delete">Delete Snapshots ({deleteSnaps.length})</TabsTrigger>
          <TabsTrigger value="requests">Restore Requests ({reqs.filter(r => r.status === "awaiting_payment" || r.status === "paid").length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="reset" className="mt-4">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <SnapTable rows={resetSnaps} />}</TabsContent>
        <TabsContent value="delete" className="mt-4">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <SnapTable rows={deleteSnaps} />}</TabsContent>

        <TabsContent value="requests" className="mt-4">
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Kind</th>
                  <th className="p-2 text-left">Mode</th>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Payment Ref</th>
                  <th className="p-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {reqs.length === 0 && (<tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No requests</td></tr>)}
                {reqs.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 text-xs">{fmtDate(r.created_at)}</td>
                    <td className="p-2 capitalize">{r.kind}</td>
                    <td className="p-2 capitalize">{r.merge_mode}</td>
                    <td className="p-2 font-semibold">৳{r.amount_bdt}</td>
                    <td className="p-2"><span className="rounded bg-muted px-2 py-0.5 text-xs">{r.status}</span></td>
                    <td className="p-2 text-xs">{r.payment_ref || "—"}</td>
                    <td className="p-2">
                      {(r.status === "awaiting_payment" || r.status === "paid") && (
                        <Button size="sm" variant="outline" onClick={() => { setDecideOn(r); setPaymentRef(r.payment_ref || ""); setNote(r.admin_note || ""); }}>
                          Decide
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          {settings && (
            <div className="max-w-md space-y-3 rounded-lg border bg-card p-4">
              <div><Label>Reset restore price (৳)</Label>
                <Input type="number" value={settings.reset_price_bdt} onChange={(e) => setSettings({ ...settings, reset_price_bdt: Number(e.target.value) })} /></div>
              <div><Label>Delete restore price (৳)</Label>
                <Input type="number" value={settings.delete_price_bdt} onChange={(e) => setSettings({ ...settings, delete_price_bdt: Number(e.target.value) })} /></div>
              <div><Label>Retention days</Label>
                <Input type="number" value={settings.retention_days} onChange={(e) => setSettings({ ...settings, retention_days: Number(e.target.value) })} /></div>
              <div><Label>Max reset snapshots / user</Label>
                <Input type="number" value={settings.max_resets_per_user} onChange={(e) => setSettings({ ...settings, max_resets_per_user: Number(e.target.value) })} /></div>
              <div><Label>Delete-restore grace days</Label>
                <Input type="number" value={settings.delete_grace_days} onChange={(e) => setSettings({ ...settings, delete_grace_days: Number(e.target.value) })} /></div>
              <Button onClick={saveSettings} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!decideOn} onOpenChange={(v) => { if (!v) setDecideOn(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Decide restore request</DialogTitle></DialogHeader>
          {decideOn && (
            <div className="space-y-3">
              <div className="rounded bg-muted/50 p-2 text-sm">
                <div>Kind: <b className="capitalize">{decideOn.kind}</b> • Mode: <b className="capitalize">{decideOn.merge_mode}</b></div>
                <div>Amount: <b>৳{decideOn.amount_bdt}</b></div>
              </div>
              <div><Label>Payment reference (bKash/Nagad TrxID)</Label>
                <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="TRX12345" /></div>
              <div><Label>Admin note (optional)</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => decide(false)} disabled={busy}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
            <Button onClick={() => decide(true)} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Approve & Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}