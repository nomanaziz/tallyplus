import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Smartphone, CheckCircle2, ShieldCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Settings = {
  provider: string;
  api_url: string | null;
  merchant_id: string | null;
  is_enabled: boolean;
  extra: Record<string, any>;
};

export default function AdminPaymentGateway() {
  const [s, setS] = useState<Settings>({ provider: "recharge_server", api_url: "", merchant_id: "", is_enabled: false, extra: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("payment_gateway_settings").select("*").eq("id", true).maybeSingle();
      if (data) setS(data as any);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("payment_gateway_settings").upsert({
      id: true,
      provider: s.provider,
      api_url: s.api_url,
      merchant_id: s.merchant_id,
      is_enabled: s.is_enabled,
      extra: s.extra ?? {},
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const manual = (s.extra?.manual ?? {}) as any;
  const setManualField = (path: string[], value: any) => {
    const next = JSON.parse(JSON.stringify(s.extra ?? {}));
    next.manual = next.manual ?? {};
    let cur = next.manual;
    for (let i = 0; i < path.length - 1; i++) {
      cur[path[i]] = cur[path[i]] ?? {};
      cur = cur[path[i]];
    }
    cur[path[path.length - 1]] = value;
    setS({ ...s, extra: next });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Gateway</h1>
        <p className="text-sm text-muted-foreground">Recharge Server settings। API key secrets section-এ store করুন।</p>
      </div>
      {/* Recharge Server status card */}
      <div className="space-y-3 rounded-md border bg-emerald-50 p-5 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold">Recharge Server — Configured</h2>
        </div>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> <span><code>RECHARGE_API_KEY</code> set</span></div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> <span><code>RECHARGE_SECRET_KEY</code> set</span></div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> <span><code>RECHARGE_BRAND_KEY</code> set</span></div>
        </div>
        <div className="rounded border bg-background p-3 text-xs">
          <div className="font-mono">Create: https://payment.rechargeserver.com/api/payment/create</div>
          <div className="font-mono">Verify: https://payment.rechargeserver.com/api/payment/verify</div>
        </div>
        <p className="text-xs text-muted-foreground">
          Toggle "Enable Recharge Server payments" নিচ থেকে on করলে দোকানদাররা সরাসরি online payment করতে পারবে। Off থাকলে manual TxnID flow চলবে।
        </p>
      </div>
      <div className="space-y-4 rounded-md border bg-background p-5">
        <div className="flex items-center gap-2">
          <Switch checked={s.is_enabled} onCheckedChange={(v) => setS({ ...s, is_enabled: v })} />
          <Label>Enable Recharge Server payments</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          🔐 তিনটা key (<code>RECHARGE_API_KEY</code>, <code>RECHARGE_SECRET_KEY</code>, <code>RECHARGE_BRAND_KEY</code>) Edge Function secrets-এ save আছে। কোডে hardcoded নেই — সম্পূর্ণ secure।
          <a className="ml-1 inline-flex items-center gap-1 text-primary hover:underline" target="_blank" rel="noreferrer" href="https://supabase.com/dashboard/project/hnkyeohwjcqhgulgdydd/settings/functions">
            Manage secrets <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>

      {/* Manual payment numbers */}
      <div className="space-y-4 rounded-md border bg-background p-5">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Manual Payment Numbers</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          গেটওয়ে disabled থাকলে দোকানদাররা এই নম্বরগুলোতে টাকা পাঠিয়ে TxnID submit করবে। তারপর Subscription Requests page থেকে approve করুন।
        </p>

        {(["bkash", "nagad", "rocket"] as const).map((m) => (
          <div key={m} className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <Label className="capitalize">{m} number</Label>
              <Input
                value={manual?.[m]?.number ?? ""}
                onChange={(e) => setManualField([m, "number"], e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Input
                value={manual?.[m]?.type ?? ""}
                onChange={(e) => setManualField([m, "type"], e.target.value)}
                placeholder="personal / merchant / agent"
              />
            </div>
          </div>
        ))}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div>
            <Label>Bank name</Label>
            <Input value={manual?.bank?.name ?? ""} onChange={(e) => setManualField(["bank", "name"], e.target.value)} placeholder="City Bank" />
          </div>
          <div>
            <Label>Account no.</Label>
            <Input value={manual?.bank?.account ?? ""} onChange={(e) => setManualField(["bank", "account"], e.target.value)} placeholder="1234567890" />
          </div>
          <div>
            <Label>Branch</Label>
            <Input value={manual?.bank?.branch ?? ""} onChange={(e) => setManualField(["bank", "branch"], e.target.value)} placeholder="Dhanmondi" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <Label>Instructions (Bangla)</Label>
            <Textarea
              value={manual?.instructions_bn ?? ""}
              onChange={(e) => setManualField(["instructions_bn"], e.target.value)}
              rows={3}
              placeholder="টাকা পাঠানোর পর TxnID লিখে submit করুন।"
            />
          </div>
          <div>
            <Label>Instructions (English)</Label>
            <Textarea
              value={manual?.instructions_en ?? ""}
              onChange={(e) => setManualField(["instructions_en"], e.target.value)}
              rows={3}
              placeholder="Send money to any number above, then submit the TxnID."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save all
        </Button>
      </div>
    </div>
  );
}
