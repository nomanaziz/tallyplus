import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Gateway</h1>
        <p className="text-sm text-muted-foreground">Recharge Server settings। API key secrets section-এ store করুন।</p>
      </div>
      <div className="space-y-4 rounded-md border bg-background p-5">
        <div className="flex items-center gap-2">
          <Switch checked={s.is_enabled} onCheckedChange={(v) => setS({ ...s, is_enabled: v })} />
          <Label>Enable Recharge Server payments</Label>
        </div>
        <div><Label>Provider</Label><Input value={s.provider} onChange={(e) => setS({ ...s, provider: e.target.value })} /></div>
        <div><Label>API URL</Label><Input value={s.api_url ?? ""} onChange={(e) => setS({ ...s, api_url: e.target.value })} placeholder="https://recharge-server.example/api" /></div>
        <div><Label>Merchant ID</Label><Input value={s.merchant_id ?? ""} onChange={(e) => setS({ ...s, merchant_id: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">
          🔐 API key/secret <strong>Edge Function secrets</strong>-এ <code>RECHARGE_SERVER_API_KEY</code> নামে save করুন।
        </p>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save</Button>
      </div>
    </div>
  );
}
