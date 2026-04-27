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
  Check, Crown, Loader2, Infinity as InfinityIcon, Wallet,
  Copy, ArrowRight, Sparkles, CreditCard, Smartphone,
} from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string; code: string; name_bn: string; name_en: string;
  price_bdt: number; old_price_bdt: number | null; duration_days: number;
  max_shops: number; is_lifetime: boolean; perks: string[];
  description_bn: string | null; description_en: string | null; discount_pct: number;
};

type PaymentMethodRow = {
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
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [pickedMethodId, setPickedMethodId] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState<string>("free");
  const [currentExpires, setCurrentExpires] = useState<string | null>(null);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [payMode, setPayMode] = useState<"choose" | "online" | "manual">("choose");
  const [txnId, setTxnId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: pl }, { data: gw }, { data: pm }, sub] = await Promise.all([
        supabase.from("subscription_plans")
          .select("id,code,name_bn,name_en,price_bdt,old_price_bdt,duration_days,max_shops,is_lifetime,perks,description_bn,description_en,discount_pct")
          .eq("is_active", true).order("price_bdt"),
        supabase.from("payment_gateway_settings").select("is_enabled").eq("id", true).maybeSingle(),
        supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order").order("created_at"),
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
      const list = (pm as PaymentMethodRow[]) ?? [];
      setMethods(list);
      if (list.length > 0) setPickedMethodId(list[0].id);
      const subRow = (sub as any)?.data ?? sub;
      const code = (subRow as any)?.subscription_plans?.code ?? "free";
      setCurrentCode(code);
      setCurrentExpires((subRow as any)?.expires_at ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  const handlePickPaid = (p: Plan) => {
    if (!user) return toast.error(lang === "bn" ? "আগে লগইন করুন" : "Please log in");
    setSelected(p);
    setPayMode("choose");
    setTimeout(() => {
      document.getElementById("pay-step")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const startOnlinePayment = async () => {
    if (!user || !selected) return;
    setBusyId(selected.id);
    const { data, error } = await supabase.functions.invoke("recharge-create-payment", {
      body: { plan_id: selected.id, origin: window.location.origin, phone: user.phone ?? user.email ?? "" },
    });
    setBusyId(null);
    if (error || !data?.payment_url) {
      toast.error(error?.message ?? data?.error ?? (lang === "bn" ? "পেমেন্ট তৈরি করা যায়নি" : "Could not create payment"));
      return;
    }
    window.location.href = data.payment_url as string;
  };

  const submitManual = async () => {
    if (!user || !selected) return;
    if (!txnId.trim()) {
      toast.error(lang === "bn" ? "TxnID দিন" : "Please enter Transaction ID");
      return;
    }
    const picked = methods.find((m) => m.id === pickedMethodId);
    if (!picked) {
      toast.error(lang === "bn" ? "একটি পেমেন্ট মাধ্যম নির্বাচন করুন" : "Pick a payment method");
      return;
    }
    // map to enum value
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
      payment_method: pm as any,
      txn_id: txnId.trim(),
      admin_note: noteWithMethod,
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
  const pickedMethod = methods.find((m) => m.id === pickedMethodId) ?? null;

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
                ) : (
                  lang === "bn" ? "নির্বাচন করুন" : "Select"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Step 2 — Choose how to pay (Online vs Manual) */}
      {selected && (
        <div id="pay-step" className="mt-8 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold">
              {lang === "bn" ? "পেমেন্ট পদ্ধতি বেছে নিন" : "Choose how to pay"}
            </h2>
            <div className="rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
              {lang === "bn" ? "প্ল্যান:" : "Plan:"}{" "}
              <strong>{lang === "bn" ? selected.name_bn : selected.name_en}</strong>{" "}
              — <strong>{fmtMoney(finalPrice(selected), lang)}</strong>
            </div>
          </div>

          {payMode === "choose" && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  if (!gatewayEnabled) {
                    toast.error(lang === "bn" ? "অনলাইন পেমেন্ট এখন বন্ধ আছে — manual payment বেছে নিন" : "Online payment is currently disabled — pick manual payment");
                    return;
                  }
                  setPayMode("online");
                }}
                className={"group rounded-2xl border-2 p-5 text-left transition " + (gatewayEnabled ? "border-primary/40 hover:border-primary hover:bg-primary/5" : "border-dashed opacity-60")}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold">
                      {lang === "bn" ? "অনলাইন পেমেন্ট" : "Pay Online"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lang === "bn" ? "Card / bKash / Nagad / Rocket — তাত্ক্ষণিক active" : "Card / bKash / Nagad / Rocket — instant"}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                {!gatewayEnabled && (
                  <p className="mt-3 text-xs text-amber-600">
                    {lang === "bn" ? "এখন বন্ধ আছে" : "Currently disabled"}
                  </p>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPayMode("manual")}
                className="group rounded-2xl border-2 border-primary/40 p-5 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold">
                      {lang === "bn" ? "ম্যানুয়াল পেমেন্ট" : "Manual Payment"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lang === "bn" ? "bKash/Nagad-এ টাকা পাঠিয়ে TxnID দিন — admin verify করবে" : "Send to bKash/Nagad, submit TxnID — admin verifies"}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            </div>
          )}

          {payMode === "online" && (
            <div className="mt-5 rounded-xl border bg-muted/30 p-5">
              <p className="text-sm text-muted-foreground">
                {lang === "bn"
                  ? "নিচের button-এ click করলে আপনাকে secure payment page-এ নিয়ে যাবে। সফল payment-এর পর automatic আপনার subscription active হবে।"
                  : "Clicking below redirects you to a secure payment page. Your subscription activates automatically once paid."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={startOnlinePayment} disabled={busyId === selected.id} className="h-11 font-bold">
                  {busyId === selected.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : (lang === "bn" ? "অনলাইন পেমেন্ট শুরু করুন" : "Start Online Payment")}
                </Button>
                <Button variant="outline" onClick={() => setPayMode("choose")} className="h-11">
                  {lang === "bn" ? "ফিরে যান" : "Back"}
                </Button>
              </div>
            </div>
          )}

          {payMode === "manual" && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h3 className="text-base font-extrabold">
              {lang === "bn" ? "ম্যানুয়াল পেমেন্ট" : "Manual Payment"}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setPayMode("choose")} className="ml-auto">
              {lang === "bn" ? "← ফিরে যান" : "← Back"}
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "bn"
              ? "নিচের যেকোনো নম্বরে টাকা পাঠান, তারপর Transaction ID দিন। admin verify করে subscription active করবে।"
              : "Send money to any number below, then submit the Transaction ID. Admin will verify and activate."}
          </p>

          {/* Method cards */}
          {methods.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              {lang === "bn"
                ? "এখনো কোনো পেমেন্ট মাধ্যম সেট করা হয়নি — admin-এর সাথে যোগাযোগ করুন।"
                : "No payment methods configured yet — contact admin."}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {methods.map((m) => {
                const isPicked = pickedMethodId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPickedMethodId(m.id)}
                    className={"group overflow-hidden rounded-xl border-2 text-left transition " + (isPicked ? "border-primary shadow-md" : "border-border hover:border-primary/40")}
                  >
                    <div className="flex items-center gap-3 p-3" style={{ backgroundColor: m.color + "15" }}>
                      <div className="flex items-center justify-center rounded-md text-2xl shadow-sm"
                           style={{ backgroundColor: m.color, width: 42, height: 42, color: "#fff" }}>
                        {m.icon_emoji || "💳"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">{m.name}</div>
                        {m.account_holder && (
                          <div className="truncate text-xs text-muted-foreground">{m.account_holder}</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <code className="font-mono text-base font-bold">{m.account_number}</code>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); copy(m.account_number); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); copy(m.account_number); } }}
                          className="inline-flex h-8 items-center gap-1 rounded-md border bg-muted/50 px-2 text-xs font-semibold hover:bg-muted"
                        >
                          <Copy className="h-3 w-3" /> {lang === "bn" ? "কপি" : "Copy"}
                        </span>
                      </div>
                      {m.extra_info && (
                        <div className="text-[11px] text-muted-foreground">{m.extra_info}</div>
                      )}
                      {(m.instructions_bn || m.instructions_en) && (
                        <div className="whitespace-pre-line rounded bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                          {(lang === "bn" ? m.instructions_bn : m.instructions_en) || m.instructions_en || m.instructions_bn}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TxnID form */}
          {methods.length > 0 && (
          <div className="mt-5 grid gap-3">
            {pickedMethod && (
              <div className="rounded-lg border-l-4 bg-muted/30 px-3 py-2 text-xs"
                   style={{ borderLeftColor: pickedMethod.color }}>
                {lang === "bn" ? "নির্বাচিত মাধ্যম: " : "Selected method: "}
                <strong>{pickedMethod.name}</strong> · <code className="font-mono">{pickedMethod.account_number}</code>
              </div>
            )}
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
              disabled={submitting || !selected || !txnId.trim() || !pickedMethodId}
              className="h-11 w-full font-bold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "bn" ? "অনুরোধ জমা দিন" : "Submit Request")}
            </Button>
          </div>
          )}
        </div>
          )}
        </div>
      )}
    </div>
  );
}
