import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";

type Settings = { default_commission_pct: number; lifetime_commission_pct: number; referee_discount_pct: number; is_program_active: boolean };
type Tier = { id: string; name: string; min_sales: number; commission_pct: number; bonus_pct: number; sort_order: number };
type AffiliateRow = { id: string; full_name: string; phone: string; email: string | null; referral_code: string; status: string; total_referrals: number; total_commission: number; created_at: string };
type CommissionRow = { id: string; affiliate_id: string; subscription_amount: number; commission_pct: number; commission_amount: number; status: string; created_at: string };

export const Route = createFileRoute("/admin/affiliates")({
  component: AdminAffiliates,
});

function AdminAffiliates() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Affiliate Program</h1>
        <p className="text-sm text-muted-foreground">Manage commission settings, tiers, partners, and payouts.</p>
      </div>
      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
        <TabsContent value="tiers" className="mt-4"><TiersTab /></TabsContent>
        <TabsContent value="affiliates" className="mt-4"><AffiliatesTab /></TabsContent>
        <TabsContent value="commissions" className="mt-4"><CommissionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsTab() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("affiliate_settings").select("*").eq("id", true).maybeSingle();
      setS(data as Settings);
    })();
  }, []);
  const save = async () => {
    if (!s) return;
    setBusy(true);
    const { error } = await supabase.from("affiliate_settings").update(s).eq("id", true);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };
  if (!s) return <Loader2 className="mx-auto h-5 w-5 animate-spin" />;
  return (
    <Card><CardContent className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Default commission %</Label><Input type="number" value={s.default_commission_pct} onChange={(e) => setS({ ...s, default_commission_pct: Number(e.target.value) })} /></div>
        <div><Label>Lifetime commission %</Label><Input type="number" value={s.lifetime_commission_pct} onChange={(e) => setS({ ...s, lifetime_commission_pct: Number(e.target.value) })} /></div>
        <div><Label>Referee discount %</Label><Input type="number" value={s.referee_discount_pct} onChange={(e) => setS({ ...s, referee_discount_pct: Number(e.target.value) })} /></div>
        <div className="flex items-center gap-2 pt-6"><input id="active" type="checkbox" checked={s.is_program_active} onChange={(e) => setS({ ...s, is_program_active: e.target.checked })} /><Label htmlFor="active">Program active</Label></div>
      </div>
      <Button onClick={save} disabled={busy}><Save className="mr-2 h-4 w-4" /> Save settings</Button>
    </CardContent></Card>
  );
}

function TiersTab() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const load = async () => {
    const { data } = await supabase.from("affiliate_tiers").select("*").order("sort_order");
    setTiers((data as Tier[]) ?? []);
  };
  useEffect(() => { void load(); }, []);
  const save = async (t: Tier) => {
    const { id, ...rest } = t;
    const { error } = await supabase.from("affiliate_tiers").update(rest).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };
  const add = async () => {
    const { error } = await supabase.from("affiliate_tiers").insert({ name: "New tier", min_sales: 0, commission_pct: 15, bonus_pct: 0, sort_order: tiers.length + 1 });
    if (error) toast.error(error.message); else void load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this tier?")) return;
    const { error } = await supabase.from("affiliate_tiers").delete().eq("id", id);
    if (error) toast.error(error.message); else void load();
  };
  return (
    <Card><CardContent className="space-y-3 p-4">
      <Button onClick={add} size="sm"><Plus className="mr-1 h-4 w-4" /> Add tier</Button>
      <div className="space-y-2">
        {tiers.map((t) => (
          <div key={t.id} className="grid items-end gap-2 rounded border p-3 md:grid-cols-6">
            <div><Label>Name</Label><Input value={t.name} onChange={(e) => setTiers(tiers.map((x) => x.id === t.id ? { ...x, name: e.target.value } : x))} /></div>
            <div><Label>Min sales</Label><Input type="number" value={t.min_sales} onChange={(e) => setTiers(tiers.map((x) => x.id === t.id ? { ...x, min_sales: Number(e.target.value) } : x))} /></div>
            <div><Label>Commission %</Label><Input type="number" value={t.commission_pct} onChange={(e) => setTiers(tiers.map((x) => x.id === t.id ? { ...x, commission_pct: Number(e.target.value) } : x))} /></div>
            <div><Label>Bonus %</Label><Input type="number" value={t.bonus_pct} onChange={(e) => setTiers(tiers.map((x) => x.id === t.id ? { ...x, bonus_pct: Number(e.target.value) } : x))} /></div>
            <div><Label>Sort</Label><Input type="number" value={t.sort_order} onChange={(e) => setTiers(tiers.map((x) => x.id === t.id ? { ...x, sort_order: Number(e.target.value) } : x))} /></div>
            <div className="flex gap-1"><Button size="sm" onClick={() => save(t)}><Save className="h-4 w-4" /></Button><Button size="sm" variant="destructive" onClick={() => del(t.id)}><Trash2 className="h-4 w-4" /></Button></div>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

function AffiliatesTab() {
  const [list, setList] = useState<AffiliateRow[]>([]);
  const [q, setQ] = useState("");
  const load = async () => {
    const { data } = await supabase.from("affiliates").select("*").order("created_at", { ascending: false }).limit(500);
    setList((data as AffiliateRow[]) ?? []);
  };
  useEffect(() => { void load(); }, []);
  const toggle = async (id: string, status: string) => {
    const next = status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("affiliates").update({ status: next }).eq("id", id);
    if (error) toast.error(error.message); else void load();
  };
  const filtered = list.filter((a) => !q || a.full_name.toLowerCase().includes(q.toLowerCase()) || a.phone.includes(q) || a.referral_code.includes(q.toUpperCase()));
  return (
    <Card><CardContent className="space-y-3 p-4">
      <Input placeholder="Search name / phone / code" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>
          <th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Phone</th><th className="px-3 py-2 text-left">Code</th>
          <th className="px-3 py-2 text-right">Refs</th><th className="px-3 py-2 text-right">Earnings</th><th className="px-3 py-2 text-left">Status</th><th></th>
        </tr></thead>
        <tbody>{filtered.map((a) => (
          <tr key={a.id} className="border-t">
            <td className="px-3 py-2 font-semibold">{a.full_name}</td>
            <td className="px-3 py-2">{a.phone}</td>
            <td className="px-3 py-2"><code>{a.referral_code}</code></td>
            <td className="px-3 py-2 text-right">{a.total_referrals}</td>
            <td className="px-3 py-2 text-right">৳{Number(a.total_commission).toLocaleString()}</td>
            <td className="px-3 py-2"><Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge></td>
            <td className="px-3 py-2"><Button size="sm" variant="outline" onClick={() => toggle(a.id, a.status)}>{a.status === "active" ? "Suspend" : "Activate"}</Button></td>
          </tr>))}
          {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No affiliates</td></tr>}
        </tbody>
      </table></div>
    </CardContent></Card>
  );
}

function CommissionsTab() {
  const [list, setList] = useState<CommissionRow[]>([]);
  const load = async () => {
    const { data } = await supabase.from("affiliate_commissions").select("*").order("created_at", { ascending: false }).limit(500);
    setList((data as CommissionRow[]) ?? []);
  };
  useEffect(() => { void load(); }, []);
  const setStatus = async (id: string, status: string) => {
    const patch = status === "paid"
      ? { status, paid_at: new Date().toISOString() }
      : { status };
    const { error } = await supabase.from("affiliate_commissions").update(patch).eq("id", id);
    if (error) toast.error(error.message); else void load();
  };
  return (
    <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm">
      <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>
        <th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Sub Amount</th><th className="px-3 py-2 text-right">%</th>
        <th className="px-3 py-2 text-right">Commission</th><th className="px-3 py-2 text-left">Status</th><th></th>
      </tr></thead>
      <tbody>{list.map((c) => (
        <tr key={c.id} className="border-t">
          <td className="px-3 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
          <td className="px-3 py-2 text-right">৳{Number(c.subscription_amount).toLocaleString()}</td>
          <td className="px-3 py-2 text-right">{Number(c.commission_pct)}%</td>
          <td className="px-3 py-2 text-right font-semibold">৳{Number(c.commission_amount).toLocaleString()}</td>
          <td className="px-3 py-2"><Badge variant={c.status === "paid" ? "default" : "secondary"}>{c.status}</Badge></td>
          <td className="px-3 py-2 text-right">
            {c.status !== "approved" && c.status !== "paid" && <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "approved")}>Approve</Button>}
            {c.status !== "paid" && <Button size="sm" className="ml-1" onClick={() => setStatus(c.id, "paid")}>Mark paid</Button>}
          </td>
        </tr>))}
        {list.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No commissions yet</td></tr>}
      </tbody>
    </table></div></CardContent></Card>
  );
}