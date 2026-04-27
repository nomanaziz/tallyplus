import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Save, CheckCircle2, ShieldCheck, ExternalLink,
  Plus, Pencil, Trash2, GripVertical, ArrowUp, ArrowDown, CreditCard, Smartphone, Building2, Wallet,
} from "lucide-react";
import { toast } from "sonner";

type GatewaySettings = {
  provider: string;
  is_enabled: boolean;
  extra: Record<string, any>;
};

type PaymentMethod = {
  id: string;
  name: string;
  type: string;
  account_number: string;
  account_holder: string | null;
  extra_info: string | null;
  instructions_bn: string | null;
  instructions_en: string | null;
  color: string;
  icon_emoji: string | null;
  is_active: boolean;
  sort_order: number;
};

const PRESET_COLORS = [
  "#E2136B", "#EB7100", "#8B2C8E", "#1E40AF", "#059669",
  "#DC2626", "#7C3AED", "#0891B2", "#CA8A04", "#475569",
];

const TYPE_OPTIONS = [
  { value: "mobile", label: "Mobile Wallet (bKash/Nagad/Rocket)", icon: Smartphone },
  { value: "bank", label: "Bank Account", icon: Building2 },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "other", label: "Other", icon: Wallet },
];

const EMOJI_OPTIONS = ["📱", "🏦", "💳", "💰", "💵", "🪙", "📲", "💼"];

const blankMethod = (sortOrder: number): Omit<PaymentMethod, "id"> => ({
  name: "",
  type: "mobile",
  account_number: "",
  account_holder: null,
  extra_info: null,
  instructions_bn: null,
  instructions_en: null,
  color: "#E2136B",
  icon_emoji: "📱",
  is_active: true,
  sort_order: sortOrder,
});

export default function AdminPaymentGateway() {
  const [s, setS] = useState<GatewaySettings>({ provider: "recharge_server", is_enabled: false, extra: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [editing, setEditing] = useState<(Omit<PaymentMethod, "id"> & { id?: string }) | null>(null);

  const loadAll = async () => {
    const [{ data: gw }, { data: pm }] = await Promise.all([
      supabase.from("payment_gateway_settings").select("provider,is_enabled,extra").eq("id", true).maybeSingle(),
      supabase.from("payment_methods").select("*").order("sort_order").order("created_at"),
    ]);
    if (gw) setS({ provider: gw.provider, is_enabled: gw.is_enabled, extra: (gw.extra as any) ?? {} });
    setMethods((pm as PaymentMethod[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void loadAll(); }, []);

  const saveGateway = async () => {
    setSaving(true);
    const { error } = await supabase.from("payment_gateway_settings").upsert({
      id: true,
      provider: s.provider,
      is_enabled: s.is_enabled,
      extra: s.extra ?? {},
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const saveMethod = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Name required");
    if (!editing.account_number.trim()) return toast.error("Account number required");

    const payload = {
      name: editing.name.trim(),
      type: editing.type,
      account_number: editing.account_number.trim(),
      account_holder: editing.account_holder?.trim() || null,
      extra_info: editing.extra_info?.trim() || null,
      instructions_bn: editing.instructions_bn?.trim() || null,
      instructions_en: editing.instructions_en?.trim() || null,
      color: editing.color,
      icon_emoji: editing.icon_emoji,
      is_active: editing.is_active,
      sort_order: editing.sort_order,
    };

    const { error } = editing.id
      ? await supabase.from("payment_methods").update(payload).eq("id", editing.id)
      : await supabase.from("payment_methods").insert(payload);

    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Updated" : "Added");
    setEditing(null);
    void loadAll();
  };

  const deleteMethod = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void loadAll();
  };

  const toggleActive = async (m: PaymentMethod) => {
    const { error } = await supabase.from("payment_methods").update({ is_active: !m.is_active }).eq("id", m.id);
    if (error) return toast.error(error.message);
    void loadAll();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= methods.length) return;
    const a = methods[idx], b = methods[j];
    await Promise.all([
      supabase.from("payment_methods").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("payment_methods").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    void loadAll();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Gateway</h1>
        <p className="text-sm text-muted-foreground">Online gateway ও manual payment methods management।</p>
      </div>

      {/* Recharge Server status */}
      <div className="space-y-3 rounded-md border bg-emerald-50 p-5 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold">Recharge Server — Configured</h2>
        </div>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> <code>RECHARGE_API_KEY</code> set</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> <code>RECHARGE_SECRET_KEY</code> set</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> <code>RECHARGE_BRAND_KEY</code> set</div>
        </div>
        <p className="text-xs text-muted-foreground">
          🔐 Secrets Edge Functions-এ secure।
          <a className="ml-1 inline-flex items-center gap-1 text-primary hover:underline" target="_blank" rel="noreferrer" href="https://supabase.com/dashboard/project/hnkyeohwjcqhgulgdydd/settings/functions">
            Manage <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>

      <div className="space-y-4 rounded-md border bg-background p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={s.is_enabled} onCheckedChange={(v) => setS({ ...s, is_enabled: v })} />
            <Label>Enable Recharge Server payments</Label>
          </div>
          <Button onClick={saveGateway} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ON: customers সরাসরি online pay করবে। OFF: নিচের manual methods দেখাবে।
        </p>
      </div>

      {/* Manual payment methods */}
      <div className="space-y-4 rounded-md border bg-background p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Manual Payment Methods</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              যেকোনো সংখ্যক bKash, Nagad, Bank, Card method add করুন। Active গুলোই customer-কে দেখানো হবে।
            </p>
          </div>
          <Button size="sm" onClick={() => setEditing({ ...blankMethod(methods.length) })}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>

        {methods.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            কোনো method add করা হয়নি। উপরের "Add" বাটনে ক্লিক করুন।
          </div>
        ) : (
          <div className="space-y-2">
            {methods.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <div className="flex items-center justify-center rounded-md text-2xl"
                     style={{ backgroundColor: m.color + "22", width: 44, height: 44 }}>
                  {m.icon_emoji || "💳"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{m.name}</span>
                    {!m.is_active && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">Inactive</span>}
                  </div>
                  <div className="truncate font-mono text-xs text-muted-foreground">{m.account_number}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === methods.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                  <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                  <Button size="icon" variant="ghost" onClick={() => setEditing({ ...m })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMethod(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Create dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Method" : "Add Payment Method"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. bKash Personal, City Bank" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Icon</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {EMOJI_OPTIONS.map((e) => (
                      <button key={e} type="button"
                        onClick={() => setEditing({ ...editing, icon_emoji: e })}
                        className={"h-9 w-9 rounded-md border text-lg " + (editing.icon_emoji === e ? "border-primary bg-primary/10" : "")}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label>Account Number *</Label>
                <Input value={editing.account_number} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })} placeholder="01XXXXXXXXX or 1234567890" />
              </div>

              <div>
                <Label>Account Holder Name (optional)</Label>
                <Input value={editing.account_holder ?? ""} onChange={(e) => setEditing({ ...editing, account_holder: e.target.value })} placeholder="Md. Karim" />
              </div>

              <div>
                <Label>Extra Info (optional)</Label>
                <Input value={editing.extra_info ?? ""} onChange={(e) => setEditing({ ...editing, extra_info: e.target.value })} placeholder="Branch, routing no, etc." />
              </div>

              <div>
                <Label>Color</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                         className="h-9 w-12 cursor-pointer rounded border" />
                  <Input value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} className="font-mono w-32" />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setEditing({ ...editing, color: c })}
                        className="h-7 w-7 rounded border-2 transition"
                        style={{ backgroundColor: c, borderColor: editing.color === c ? "#000" : "transparent" }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div>
                  <Label>Instructions (Bangla)</Label>
                  <Textarea value={editing.instructions_bn ?? ""} onChange={(e) => setEditing({ ...editing, instructions_bn: e.target.value })} rows={2} placeholder="Send Money option-এ পাঠান, cash-out নয়।" />
                </div>
                <div>
                  <Label>Instructions (English)</Label>
                  <Textarea value={editing.instructions_en ?? ""} onChange={(e) => setEditing({ ...editing, instructions_en: e.target.value })} rows={2} placeholder="Use Send Money, not cash-out." />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active (shown to customers)</Label>
              </div>

              {/* Live preview */}
              <div>
                <Label className="text-xs text-muted-foreground">Customer preview</Label>
                <div className="mt-1 overflow-hidden rounded-xl border">
                  <div className="flex items-center gap-3 p-3" style={{ backgroundColor: editing.color + "15" }}>
                    <div className="flex items-center justify-center rounded-md text-2xl"
                         style={{ backgroundColor: editing.color, width: 44, height: 44, color: "#fff" }}>
                      {editing.icon_emoji || "💳"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold">{editing.name || "Method name"}</div>
                      {editing.account_holder && <div className="text-xs text-muted-foreground">{editing.account_holder}</div>}
                    </div>
                  </div>
                  <div className="bg-background p-3">
                    <div className="font-mono text-lg font-bold">{editing.account_number || "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveMethod}>{editing?.id ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
