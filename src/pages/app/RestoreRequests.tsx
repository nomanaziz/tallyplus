import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, History } from "lucide-react";
import { toast } from "sonner";

type Snap = { id: string; shop_name: string; kind: "reset"|"delete"; summary: Record<string, number>; created_at: string; expires_at: string; status: string };
type Req = { id: string; snapshot_id: string; kind: string; merge_mode: string; amount_bdt: number; status: string; admin_note: string | null; created_at: string };

export default function RestoreRequestsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Snap | null>(null);
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [s, r] = await Promise.all([
      supabase.from("shop_snapshots").select("id,shop_name,kind,summary,created_at,expires_at,status")
        .eq("shop_owner_id", user.id).order("created_at", { ascending: false }),
      supabase.from("shop_restore_requests").select("id,snapshot_id,kind,merge_mode,amount_bdt,status,admin_note,created_at")
        .eq("requested_by", user.id).order("created_at", { ascending: false }),
    ]);
    setSnaps((s.data as Snap[]) ?? []);
    setReqs((r.data as Req[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [user?.id]);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("submit_restore_request", { _snapshot_id: target.id, _merge_mode: mode });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string; amount?: number };
      if (!res?.ok) { toast.error(res?.error || "failed"); return; }
      toast.success(`Request পাঠানো হয়েছে। Admin payment confirm করার পর restore হবে। (৳${res.amount})`);
      setTarget(null);
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const reqFor = (snapId: string) => reqs.find((r) => r.snapshot_id === snapId);

  return (
    <div className="min-h-full bg-muted/30">
      <header className="flex items-center gap-2 border-b bg-background px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => nav({ to: "/app/dashboard" })}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold flex items-center gap-2"><History className="h-5 w-5" /> Reset / Delete History</h1>
      </header>

      <div className="mx-auto max-w-3xl space-y-3 p-4">
        <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          এখানে আপনার শেষ Reset ও Delete snapshots দেখানো হয়েছে — সর্বোচ্চ ৩০ দিনের জন্য সংরক্ষিত। Restore charge: <b>Reset ৳৫০০</b>, <b>Delete ৳১০০০</b>।
          Admin payment confirm করার পরই restore হবে।
        </div>

        {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {!loading && snaps.length === 0 && (
          <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">কোনো snapshot নেই।</div>
        )}

        {snaps.map((s) => {
          const req = reqFor(s.id);
          const expired = new Date(s.expires_at) <= new Date();
          return (
            <div key={s.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{s.shop_name} <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs capitalize">{s.kind}</span></div>
                  <div className="text-xs text-muted-foreground">তৈরি: {new Date(s.created_at).toLocaleString("en-GB")} • মেয়াদ: {new Date(s.expires_at).toLocaleDateString("en-GB")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{Object.entries(s.summary || {}).map(([k, v]) => `${k}:${v}`).join(" • ")}</div>
                </div>
                <div className="text-right">
                  {req ? (
                    <div className="text-xs">
                      <div>Status: <b className="capitalize">{req.status.replace("_", " ")}</b></div>
                      {req.admin_note && <div className="mt-1 text-muted-foreground">{req.admin_note}</div>}
                    </div>
                  ) : (
                    <Button size="sm" disabled={expired || s.status !== "available"} onClick={() => { setTarget(s); setMode("replace"); }}>Restore Request</Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!target} onOpenChange={(v) => { if (!v) setTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Request</DialogTitle>
            <DialogDescription>
              {target?.kind === "reset" ? "Reset" : "Delete"} restore charge: <b>৳{target?.kind === "reset" ? 500 : 1000}</b>। Admin payment confirm করার পর restore হবে।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">কীভাবে restore হবে?</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as "replace" | "merge")}>
                <div className="flex items-start gap-2"><RadioGroupItem value="replace" id="m1" className="mt-1" />
                  <Label htmlFor="m1" className="font-normal">শুধু পুরোনো data ফেরত (বর্তমান data মুছে যাবে) — default</Label></div>
                <div className="flex items-start gap-2"><RadioGroupItem value="merge" id="m2" className="mt-1" />
                  <Label htmlFor="m2" className="font-normal">পুরোনো + বর্তমান data একসাথে merge</Label></div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={busy}>বাতিল</Button>
            <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Request পাঠান</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}