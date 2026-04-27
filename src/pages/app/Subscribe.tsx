import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Check, Crown, Loader2, Infinity as InfinityIcon, Smartphone, Building2,
  Copy, ArrowRight, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string; code: string; name_bn: string; name_en: string;
  price_bdt: number; old_price_bdt: number | null; duration_days: number;
  max_shops: number; is_lifetime: boolean; perks: string[];
  description_bn: string | null; description_en: string | null; discount_pct: number;
};

type ManualMethod = { number?: string; type?: string };
type ManualConfig = {
  bkash?: ManualMethod;
  nagad?: ManualMethod;
  rocket?: ManualMethod;
  bank?: { name?: string; account?: string; branch?: string };
  instructions_bn?: string;
  instructions_en?: string;
};

const FREE_LIMITS_BN = "পণ্য ১০ • বিক্রয় ১০ • ক্রয় ১০ • খরচ ১০ • গ্রাহক ৫ • সাপ্লায়ার ৫";
const FREE_LIMITS_EN = "10 products • 10 sales • 10 purchases • 10 expenses • 5 customers • 5 suppliers";

export default function Subscribe() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [manual, setManual] = useState<ManualConfig>({});
  const [currentCode, setCurrentCode] = useState<string>("free");
  const [currentExpires, setCurrentExpires] = useState<string | null>(null);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [payMethod, setPayMethod] = useState<"bkash" | "nagad" | "rocket" | "bank">("bkash");
  const [txnId, setTxnId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: pl }, { data: gw }, sub] = await Promise.all([
        supabase.from("subscription_plans")
          .select("id,code,name_bn,name_en,price_bdt,old_price_bdt,duration_days,max_shops,is_lifetime,perks,description_bn,description_en,discount_pct")
          .eq("is_active", true).order("price_bdt"),
        supabase.from("payment_gateway_settings").select("is_enabled,extra").eq("id", true).maybeSingle(),
        user ? supabase
          .from("subscriptions")
          .select("expires_at,status,subscription_plans!inner(code)")
          .eq("user_id", user.id).eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      setPlans((pl as Plan[]) ?? []);
      setGatewayEnabled(!!gw?.is_enabled);
      const extra = (gw?.extra as any) ?? {};
      setManual((extra?.manual ?? {}) as ManualConfig);
      const subRow = (sub as any)?.data ?? sub;
      const code = (subRow as any)?.subscription_plans?.code ?? "free";
      setCurrentCode(code);
      setCurrentExpires((subRow as any)?.expires_at ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  const handlePickPaid = async (p: Plan) => {
    if (!user) return toast.error(lang === "bn" ? "আগে লগইন করুন" : "Please log in");
    if (gatewayEnabled) {
      setBusyId(p.id);
      const { data, error } = await supabase.functions.invoke("recharge-create-payment", {
        body: { plan_id: p.id, origin: window.location.origin, phone: user.phone ?? user.email ?? "" },
      });
      setBusyId(null);
      if (error || !data?.payment_url) {
        toast.error(error?.message ?? data?.error ?? (lang === "bn" ? "পেমেন্ট তৈরি করা যায়নি" : "Could not create payment"));
        return;
      }
      window.location.href = data.payment_url as string;
      return;
    }
    setSelected(p);
    setTimeout(() => {
      document.getElementById("manual-pay")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const submitManual = async () => {
    if (!user || !selected) return;
    if (!txnId.trim()) {
      toast.error(lang === "bn" ? "TxnID দিন" : "Please enter Transaction ID");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("subscription_requests").insert({
      user_id: user.id,
      plan_id: selected.id,
      payment_method: payMethod as any,
      txn_id: txnId.trim(),
      admin_note: note.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "অনুরোধ পাঠানো হয়েছে — admin verify করবে" : "Request sent — admin will verify");
    setTxnId(""); setNote(""); setSelected(null);
  };

  const copy = (text?: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast.success(lang === "bn" ? "কপি হয়েছে" : "Copied");
  };

  const currentPlanName = useMemo(() => {
    if (currentCode === "free") return lang === "bn" ? "ফ্রি" : "Free";
    const p = plans.find((x) => x.code === currentCode);
    return p ? (lang === "bn" ? p.name_bn : p.name_en) : currentCode;
  }, [currentCode, plans, lang]);

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const finalPrice = (p: Plan) => p.discount_pct ? Math.round(p.price_bdt * (1 - p.discount_pct / 100)) : p.price_bdt;
  const methodInfo: ManualMethod | undefined =
    payMethod === "bank" ? undefined : (manual[payMethod] as ManualMethod | undefined);

  return (
    <div className="container px-3 py-4 md:px-4 md:py-6">
      <div className="mb-2 text-xs text-muted-foreground">{lang === "bn" ? "সেটিংস" : "Settings"}</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{lang === "bn" ? "সাবস্ক্রিপশন" : "Subscription"}</h1>
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{lang === "bn" ? "বর্তমান প্ল্যান:" : "Current plan:"}</span>
          <span className="font-bold">{currentPlanName}</span>
          {currentExpires && currentCode !== "free" && (
            <span className="text-xs text-muted-foreground">· {new Date(currentExpires).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {lang === "bn" ? "ফ্রি প্ল্যানে সীমিত ব্যবহার। বেশি দোকান ও আনলিমিটেড ব্যবহারের জন্য আপগ্রেড করুন।" : "Free plan has limits. Upgrade for more shops & unlimited usage."}
      </p>

      {/* Plan grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Free plan card */}
        <div className={"relative rounded-2xl border bg-card p-5 shadow-sm " + (currentCode === "free" ? "ring-2 ring-emerald-500" : "")}>
          {currentCode === "free" && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white">
              {lang === "bn" ? "বর্তমান" : "Current"}
            </Badge>
          )}
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <div className="text-lg font-extrabold">{lang === "bn" ? "ফ্রি" : "Free"}</div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-3xl font-extrabold">৳ 0</div>
            <div className="text-sm text-muted-foreground">{lang === "bn" ? "/ চিরকাল" : "/ forever"}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{lang === "bn" ? "১টি দোকান" : "1 shop"}</div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{lang === "bn" ? FREE_LIMITS_BN : FREE_LIMITS_EN}</p>
          <Button asChild variant="outline" className="mt-5 h-11 w-full font-bold">
            <Link to="/app/usage-limits">
              {lang === "bn" ? "ব্যবহার সীমা দেখুন" : "View Usage Limits"} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {plans.map((p) => {
          const fp = finalPrice(p);
          const isLifetime = p.is_lifetime;
          const isCurrent = currentCode === p.code;
          return (
            <div key={p.id} className={"relative rounded-2xl border bg-card p-5 shadow-sm " + (isCurrent ? "ring-2 ring-emerald-500" : isLifetime ? "ring-2 ring-primary" : "")}>
              {isCurrent ? (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white">
                  {lang === "bn" ? "বর্তমান" : "Current"}
                </Badge>
              ) : isLifetime ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  {lang === "bn" ? "🔥 সেরা ডিল" : "🔥 Best Deal"}
                </span>
              ) : null}
              <div className="flex items-center gap-2">
                {isLifetime ? <InfinityIcon className="h-5 w-5 text-primary" /> : <Crown className="h-5 w-5 text-primary" />}
                <div className="text-lg font-extrabold">{lang === "bn" ? p.name_bn : p.name_en}</div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-3xl font-extrabold">{fmtMoney(fp, lang)}</div>
                {p.old_price_bdt && p.old_price_bdt > fp && (
                  <div className="text-sm text-muted-foreground line-through">{fmtMoney(p.old_price_bdt, lang)}</div>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {isLifetime
                  ? (lang === "bn" ? "এককালীন" : "One-time")
                  : `${p.duration_days} ${lang === "bn" ? "দিন" : "days"}`} · {p.max_shops} {lang === "bn" ? "দোকান" : "shops"}
              </div>
              {(p.description_bn || p.description_en) && (
                <p className="mt-2 text-xs">{lang === "bn" ? p.description_bn : p.description_en}</p>
              )}
              <ul className="mt-4 space-y-1.5 text-sm">
                {(Array.isArray(p.perks) ? p.perks : []).slice(0, 5).map((perk: string) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded bg-emerald-500"><Check className="h-3 w-3 text-white" /></span>
                    <span className="text-xs">{perk}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handlePickPaid(p)}
                disabled={busyId === p.id || isCurrent}
                className="mt-5 h-11 w-full font-bold"
                variant={isCurrent ? "outline" : "default"}
              >
                {busyId === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrent ? (
                  lang === "bn" ? "চলমান" : "Active"
                ) : gatewayEnabled ? (
                  lang === "bn" ? "এখনই কিনুন" : "Buy Now"
                ) : (
                  lang === "bn" ? "নির্বাচন করুন" : "Select"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Manual payment */}
      {!gatewayEnabled && (
        <div id="manual-pay" className="mt-8 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold">
              {lang === "bn" ? "ম্যানুয়াল পেমেন্ট" : "Manual Payment"}
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "bn"
              ? "নিচের যেকোনো নম্বরে টাকা পাঠান, তারপর Transaction ID দিন। admin verify করে subscription active করবে।"
              : "Send money to any number below, then submit the Transaction ID. Admin will verify and activate."}
          </p>

          {selected ? (
            <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-sm">
              {lang === "bn" ? "নির্বাচিত প্ল্যান:" : "Selected plan:"}{" "}
              <strong>{lang === "bn" ? selected.name_bn : selected.name_en}</strong>{" "}
              — <strong>{fmtMoney(finalPrice(selected), lang)}</strong>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              {lang === "bn" ? "উপর থেকে একটি প্ল্যান নির্বাচন করুন।" : "Pick a plan above to continue."}
            </div>
          )}

          {/* Method picker */}
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {(["bkash", "nagad", "rocket", "bank"] as const).map((m) => {
              const labels: Record<string, string> = {
                bkash: "bKash", nagad: "Nagad", rocket: "Rocket",
                bank: lang === "bn" ? "ব্যাংক" : "Bank",
              };
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={"rounded-xl border px-3 py-2.5 text-sm font-semibold transition " + (payMethod === m ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}
                >
                  {labels[m]}
                </button>
              );
            })}
          </div>

          {/* Account display */}
          <div className="mt-4 rounded-xl border bg-background p-4">
            {payMethod === "bank" ? (
              manual.bank?.account ? (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><strong>{manual.bank.name}</strong></div>
                  <div className="flex items-center justify-between">
                    <span>A/C: <code className="font-mono text-base">{manual.bank.account}</code></span>
                    <Button size="sm" variant="ghost" onClick={() => copy(manual.bank?.account)}><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                  {manual.bank.branch && <div className="text-xs text-muted-foreground">{lang === "bn" ? "শাখা:" : "Branch:"} {manual.bank.branch}</div>}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {lang === "bn" ? "এখনো ব্যাংক নম্বর সেট করা হয়নি — admin-এর সাথে যোগাযোগ করুন।" : "Bank info not set yet — contact admin."}
                </div>
              )
            ) : methodInfo?.number ? (
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{methodInfo.type || (lang === "bn" ? "পার্সোনাল" : "Personal")}</div>
                  <code className="font-mono text-lg font-bold">{methodInfo.number}</code>
                </div>
                <Button size="sm" variant="outline" onClick={() => copy(methodInfo.number)}><Copy className="mr-1 h-3.5 w-3.5" /> {lang === "bn" ? "কপি" : "Copy"}</Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {lang === "bn" ? "এই মাধ্যমের নম্বর এখনো সেট করা হয়নি — admin-এর সাথে যোগাযোগ করুন।" : "Number not configured — contact admin."}
              </div>
            )}
          </div>

          {(manual.instructions_bn || manual.instructions_en) && (
            <p className="mt-3 whitespace-pre-line rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              {lang === "bn" ? manual.instructions_bn : manual.instructions_en}
            </p>
          )}

          {/* TxnID form */}
          <div className="mt-4 grid gap-3">
            <div>
              <Label htmlFor="txn">{lang === "bn" ? "Transaction ID *" : "Transaction ID *"}</Label>
              <Input id="txn" value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="e.g. 7A1B2C3D" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="note">{lang === "bn" ? "মন্তব্য (ঐচ্ছিক)" : "Note (optional)"}</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1" />
            </div>
            <Button
              onClick={submitManual}
              disabled={submitting || !selected || !txnId.trim()}
              className="h-11 w-full font-bold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "bn" ? "অনুরোধ জমা দিন" : "Submit Request")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
