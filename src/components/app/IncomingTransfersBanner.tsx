import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Req = {
  id: string;
  shop_id: string;
  reason: string | null;
  charge_amount: number;
  shop_name?: string;
};

export function IncomingTransfersBanner() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("shop_transfer_requests")
      .select("id,shop_id,reason,charge_amount,shops!inner(name)")
      .eq("to_user_id", user.id)
      .eq("status", "pending_recipient");
    type Row = { id: string; shop_id: string; reason: string | null; charge_amount: number; shops: { name: string } | null };
    setReqs(((data as Row[] | null) ?? []).map((r) => ({
      id: r.id, shop_id: r.shop_id, reason: r.reason, charge_amount: r.charge_amount, shop_name: r.shops?.name,
    })));
  };

  useEffect(() => { void load(); }, [user?.id]);

  const respond = async (id: string, accept: boolean) => {
    setBusy(id);
    const { data, error } = await supabase.rpc("respond_shop_transfer", { _id: id, _accept: accept });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    const res = data as { ok: boolean; error?: string } | null;
    if (!res?.ok) { toast.error(res?.error ?? "Failed"); return; }
    toast.success(accept
      ? (lang === "bn" ? "Accept করা হয়েছে — admin চূড়ান্ত approve করবে" : "Accepted — admin will finalize")
      : (lang === "bn" ? "Reject করা হয়েছে" : "Rejected"));
    await load();
  };

  if (reqs.length === 0) return null;

  return (
    <div className="space-y-2">
      {reqs.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
          <ArrowRightLeft className="h-5 w-5 text-amber-700" />
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-bold text-amber-900">
              {lang === "bn" ? "দোকান হস্তান্তর অনুরোধ" : "Shop transfer request"} — {r.shop_name ?? r.shop_id.slice(0, 8)}
            </div>
            {r.reason && <div className="text-xs text-amber-800">{r.reason}</div>}
          </div>
          <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => respond(r.id, false)}>
            <X className="mr-1 h-4 w-4" /> {lang === "bn" ? "বাতিল" : "Reject"}
          </Button>
          <Button size="sm" disabled={busy === r.id} onClick={() => respond(r.id, true)}>
            {busy === r.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
            {lang === "bn" ? "গ্রহণ" : "Accept"}
          </Button>
        </div>
      ))}
    </div>
  );
}