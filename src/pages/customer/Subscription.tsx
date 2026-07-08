import { getNumLocale } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Crown, Check, CreditCard, Smartphone, ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";
import type { ConsumerSub } from "@/lib/consumer-history-access";

type Plan = {
  id: string;
  code: string;
  name_bn: string;
  description_bn: string | null;
  price_bdt: number;
  duration_days: number;
};

type PaymentMethodRow = {
  id: string;
  name: string;
  type: string;
  account_number: string;
  account_holder: string | null;
  extra_info: string | null;
  instructions_bn: string | null;
  color: string;
  icon_emoji: string | null;
};

function bdt(n: number) {
  return new Intl.NumberFormat(getNumLocale(), { maximumFractionDigits: 0 }).format(n) + " ৳";
}

export default function CustomerSubscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<ConsumerSub>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [pickedMethodId, setPickedMethodId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [payMode, setPayMode] = useState<"choose" | "online" | "manual">("choose");
  const [txnId, setTxnId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [{ data: pl }, { data: s }, { data: gw }, { data: pm }] = await Promise.all([
        supabase
          .from("subscription_plans")
          .select("id, code, name_bn, description_bn, price_bdt, duration_days")
          .like("code", "consumer_history_%")
          .eq("is_active", true)
          .order("price_bdt"),
        supabase
          .from("subscriptions")
          .select("expires_at, plan:subscription_plans(code)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .like("plan.code", "consumer_history_%")
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.rpc("payment_gateway_public").maybeSingle(),
        supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order").order("created_at"),
      ]);
      setPlans((pl ?? []) as Plan[]);
      if (s) {
        const planCode = (s.plan as { code?: string } | null)?.code ?? null;
        setSub({ plan_code: planCode, expires_at: s.expires_at });
      }
      setGatewayEnabled(!!(gw as { is_enabled?: boolean } | null)?.is_enabled);
      const list = (pm as PaymentMethodRow[]) ?? [];
      setMethods(list);
      if (list.length > 0) setPickedMethodId(list[0].id);
      setLoading(false);
    })();
  }, [user]);

  const handlePickPlan = (plan: Plan) => {
    if (!user) return toast.error("আগে লগইন করুন");
    setSelected(plan);
    setPayMode("choose");
    setTimeout(() => {
      document.getElementById("pay-step")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const startOnlinePayment = async () => {
    if (!user || !selected) return;
    setBusyId(selected.id);
    const { data, error } = await supabase.functions.invoke("recharge-create-payment", {
      body: {
        plan_id: selected.id,
        origin: window.location.origin,
        phone: user.phone ?? user.email ?? "",
        redirect_path: "/customer/subscribe/callback",
      },
    });
    setBusyId(null);
    if (error || !(data as { payment_url?: string })?.payment_url) {
      toast.error(error?.message ?? (data as { error?: string })?.error ?? "পেমেন্ট তৈরি করা যায়নি");
      return;
    }
    window.location.href = (data as { payment_url: string }).payment_url;
  };

  const submitManual = async () => {
    if (!user || !selected) return;
    if (!txnId.trim()) return toast.error("TxnID দিন");
    const picked = methods.find((m) => m.id === pickedMethodId);
    if (!picked) return toast.error("একটি পেমেন্ট মাধ্যম নির্বাচন করুন");
    const enumMap: Record<string, string> = { mobile: "other", bank: "bank", card: "card", other: "other" };
    const lower = picked.name.toLowerCase();
    let pm = enumMap[picked.type] || "other";
    if (lower.includes("bkash")) pm = "bkash";
    else if (lower.includes("nagad")) pm = "nagad";
    else if (lower.includes("rocket")) pm = "rocket";

    const noteWithMethod = `[${picked.name} • ${picked.account_number}]${note.trim() ? "\n" + note.trim() : ""}`;
    setSubmitting(true);
    const { error } = await supabase.from("subscription_requests").insert({
      user_id: user.id,
      plan_id: selected.id,
      payment_method: pm as "bkash" | "nagad" | "rocket" | "bank" | "card" | "other",
      txn_id: txnId.trim(),
      admin_note: noteWithMethod,
      status: "pending",
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("অনুরোধ পাঠানো হয়েছে — admin verify করবে");
    setTxnId("");
    setNote("");
    setSelected(null);
  };

  const copy = (text?: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast.success("কপি হয়েছে");
  };

  const planLabel = (code: string) =>
    code === "consumer_history_1y" ? "১ বছর" : code === "consumer_history_5y" ? "৫ বছর" : "১০ বছর";

  const pickedMethod = useMemo(
    () => methods.find((m) => m.id === pickedMethodId) ?? null,
    [methods, pickedMethodId],
  );

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">সাবস্ক্রিপশন</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          পুরোনো মাসের আয়-ব্যয়ের বিস্তারিত ইতিহাস দেখতে subscription নিন।
        </p>
      </div>

      {sub?.plan_code && (
        <Card className="border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-semibold">সক্রিয় প্ল্যান:</span>
            <span>{planLabel(sub.plan_code)}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            শেষ তারিখ: {sub.expires_at?.slice(0, 10)}
          </div>
        </Card>
      )}

      {plans.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          এই মুহূর্তে কোনো plan পাওয়া যায়নি।
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = sub?.plan_code === p.code;
            return (
              <Card key={p.id} className={"flex flex-col p-4 " + (isCurrent ? "ring-2 ring-primary" : "")}>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <div className="text-lg font-bold">{p.name_bn}</div>
                </div>
                <div className="mt-3 text-2xl font-extrabold">{bdt(p.price_bdt)}</div>
                <div className="text-xs text-muted-foreground">{planLabel(p.code)}</div>
                {p.description_bn && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.description_bn}</p>
                )}
                <ul className="mt-3 space-y-1 text-xs">
                  <li className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600" />
                    আগের মাসের পূর্ণ আয়-ব্যয় ইতিহাস
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600" />
                    মাসিক রিপোর্ট সংরক্ষণ
                  </li>
                </ul>
                <Button
                  onClick={() => handlePickPlan(p)}
                  disabled={busyId === p.id || isCurrent}
                  className="mt-4 w-full"
                  variant={isCurrent ? "outline" : "default"}
                >
                  {busyId === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "চলমান"
                  ) : (
                    "নির্বাচন করুন"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {selected && (
        <div id="pay-step" className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold">পেমেন্ট পদ্ধতি বেছে নিন</h2>
            <div className="rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
              প্ল্যান: <strong>{selected.name_bn}</strong> — <strong>{bdt(selected.price_bdt)}</strong>
            </div>
          </div>

          {payMode === "choose" && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  if (!gatewayEnabled) {
                    toast.error("অনলাইন পেমেন্ট এখন বন্ধ আছে — manual payment বেছে নিন");
                    return;
                  }
                  setPayMode("online");
                }}
                className={"group rounded-2xl border-2 p-4 text-left transition " + (gatewayEnabled ? "border-primary/40 hover:border-primary hover:bg-primary/5" : "border-dashed opacity-60")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold">অনলাইন পেমেন্ট</div>
                    <div className="text-xs text-muted-foreground">Card / bKash / Nagad / Rocket — তাত্ক্ষণিক active</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                {!gatewayEnabled && <p className="mt-2 text-xs text-amber-600">এখন বন্ধ আছে</p>}
              </button>

              <button
                type="button"
                onClick={() => setPayMode("manual")}
                className="group rounded-2xl border-2 border-primary/40 p-4 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold">ম্যানুয়াল পেমেন্ট</div>
                    <div className="text-xs text-muted-foreground">bKash/Nagad-এ পাঠিয়ে TxnID দিন — admin verify করবে</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            </div>
          )}

          {payMode === "online" && (
            <div className="mt-4 rounded-xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                পরবর্তী ধাপে গিয়ে Card / bKash / Nagad / Rocket-এ পেমেন্ট করুন। সফল হলে subscription তৎক্ষণাৎ active হবে।
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={startOnlinePayment} disabled={busyId === selected.id}>
                  {busyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `${bdt(selected.price_bdt)} পেমেন্ট করুন`}
                </Button>
                <Button variant="outline" onClick={() => setPayMode("choose")}>ফিরে যান</Button>
              </div>
            </div>
          )}

          {payMode === "manual" && (
            <div className="mt-4 space-y-4">
              {methods.length === 0 ? (
                <Card className="p-4 text-sm text-muted-foreground">কোনো manual পেমেন্ট মাধ্যম configure করা নেই — admin-এর সাথে যোগাযোগ করুন।</Card>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {methods.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPickedMethodId(m.id)}
                        className={"rounded-xl border-2 p-3 text-left transition " + (pickedMethodId === m.id ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40")}
                      >
                        <div className="flex items-center gap-2 font-bold">
                          <span>{m.icon_emoji ?? "💳"}</span>
                          <span>{m.name}</span>
                        </div>
                        <div className="mt-1 font-mono text-sm">{m.account_number}</div>
                        {m.account_holder && <div className="text-xs text-muted-foreground">{m.account_holder}</div>}
                      </button>
                    ))}
                  </div>

                  {pickedMethod && (
                    <Card className="p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground">পাঠাবেন এই নম্বরে:</div>
                          <div className="font-mono text-base font-bold">{pickedMethod.account_number}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => copy(pickedMethod.account_number)}>
                          <Copy className="mr-1 h-3.5 w-3.5" /> কপি
                        </Button>
                      </div>
                      {pickedMethod.instructions_bn && (
                        <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">{pickedMethod.instructions_bn}</p>
                      )}
                      <div className="mt-2 rounded bg-muted/40 p-2 text-xs">
                        পরিমাণ: <strong>{bdt(selected.price_bdt)}</strong>
                      </div>
                    </Card>
                  )}

                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="txn">Transaction ID</Label>
                      <Input id="txn" value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="যেমন: 9X8B7A6C" />
                    </div>
                    <div>
                      <Label htmlFor="note">নোট (optional)</Label>
                      <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="অতিরিক্ত তথ্য..." rows={2} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={submitManual} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "অনুরোধ পাঠান"}
                    </Button>
                    <Button variant="outline" onClick={() => setPayMode("choose")}>ফিরে যান</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}