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
  const { lang, t } = useI18n();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [pickedMethodId, setPickedMethodId] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState<string>("free");
  const [currentExpires, setCurrentExpires] = useState<string | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [payMode, setPayMode] = useState<"choose" | "online" | "manual">("choose");
  const [txnId, setTxnId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: pl }, { data: gw }, { data: pm }, sub, trialUsed] = await Promise.all([
        supabase.from("subscription_plans")
          .select("id,code,name_bn,name_en,price_bdt,old_price_bdt,duration_days,max_shops,is_lifetime,perks,description_bn,description_en,discount_pct")
          .eq("is_active", true).order("price_bdt"),
        supabase.rpc("payment_gateway_public").maybeSingle(),
        supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order").order("created_at"),
        user ? supabase
          .from("subscriptions")
          .select("expires_at,status,subscription_plans!inner(code)")
          .eq("user_id", user.id).eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null } as any),
        user ? supabase
          .from("subscriptions")
          .select("id, subscription_plans!inner(code)")
          .eq("user_id", user.id)
          .eq("subscription_plans.code", "trial")
          .limit(1)
          .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      const allPlans = (pl as Plan[]) ?? [];
      setPlans(allPlans.filter((p) => !p.code.startsWith("consumer_history_")));
      setGatewayEnabled(!!gw?.is_enabled);
      const list = (pm as PaymentMethodRow[]) ?? [];
      setMethods(list);
      if (list.length > 0) setPickedMethodId(list[0].id);
      const subRow = (sub as any)?.data ?? sub;
      const code = (subRow as any)?.subscription_plans?.code ?? "free";
      setCurrentCode(code);
      setCurrentExpires((subRow as any)?.expires_at ?? null);
      setHasUsedTrial(!!(trialUsed as any)?.data || !!(trialUsed as any)?.id);
      setLoading(false);
    })();
  }, [user?.id]);

  const handlePickPaid = (p: Plan) => {
    if (!user) return toast.error(t("p7_Please_log_in"));
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
      toast.error(error?.message ?? data?.error ?? (t("p7_Could_not_create_payment")));
      return;
    }
    window.location.href = data.payment_url as string;
  };

  const submitManual = async () => {
    if (!user || !selected) return;
    if (!txnId.trim()) {
      toast.error(t("p7_Please_enter_Transaction_ID"));
      return;
    }
    const picked = methods.find((m) => m.id === pickedMethodId);
    if (!picked) {
      toast.error(t("p7_Pick_a_payment_method"));
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
    toast.success(t("p7_Request_sent_admin_will_verify"));
    setTxnId(""); setNote(""); setSelected(null);
  };

  const copy = (text?: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast.success(t("p7_Copied_2"));
  };

  const currentPlanName = useMemo(() => {
    if (currentCode === "free") return t("p7_Free");
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
      <div className="mb-2 text-xs text-muted-foreground">{t("p7_Settings")}</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{t("p7_Subscription")}</h1>
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{t("p7_Current_plan")}</span>
          <span className="font-bold">{currentPlanName}</span>
          {currentExpires && currentCode !== "free" && (
            <span className="text-xs text-muted-foreground">· {new Date(currentExpires).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("p7_Free_plan_has_limits_Upgrade_f")}
      </p>

      {/* Plan grid */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Free plan card */}
        <div className={"relative rounded-2xl border bg-card p-5 shadow-sm " + (currentCode === "free" ? "ring-2 ring-emerald-500" : "")}>
          {currentCode === "free" && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white">
              {t("p7_Current_2")}
            </Badge>
          )}
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <div className="text-lg font-extrabold">{t("p7_Free")}</div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-3xl font-extrabold">৳ 0</div>
            <div className="text-sm text-muted-foreground">{t("p7_forever")}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{t("p7_1_shop")}</div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{lang === "bn" ? FREE_LIMITS_BN : FREE_LIMITS_EN}</p>
          <Button asChild variant="outline" className="mt-5 h-11 w-full font-bold">
            <Link to="/app/usage-limits">
              {t("p7_View_Usage_Limits")} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {plans.filter((p) => p.code !== "trial" || !hasUsedTrial).map((p) => {
          const fp = finalPrice(p);
          const isLifetime = p.is_lifetime;
          const isCurrent = currentCode === p.code;
          return (
            <div key={p.id} className={"relative rounded-2xl border bg-card p-5 shadow-sm " + (isCurrent ? "ring-2 ring-emerald-500" : isLifetime ? "ring-2 ring-primary" : "")}>
              {isCurrent ? (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white">
                  {t("p7_Current_2")}
                </Badge>
              ) : isLifetime ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  {t("p7_Best_Deal")}
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
              {p.old_price_bdt && p.old_price_bdt > fp && (
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {t("p7_Save_3")} {fmtMoney(p.old_price_bdt - fp, lang)}
                  {p.old_price_bdt > 0 && (
                    <span className="opacity-80">
                      {" "}({Math.round(((p.old_price_bdt - fp) / p.old_price_bdt) * 100)}%)
                    </span>
                  )}
                </div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {isLifetime
                  ? (t("p7_One_time"))
                  : `${p.duration_days} ${t("p7_days")}`} · {p.max_shops} {t("p7_shops")}
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
                  t("p7_Active")
                ) : (
                  t("p7_Select")
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
              {t("p7_Choose_how_to_pay")}
            </h2>
            <div className="rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
              {t("p7_Plan")}{" "}
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
                    toast.error(t("p7_Online_payment_is_currently_di"));
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
                      {t("p7_Pay_Online")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("p7_Card_bKash_Nagad_Rocket_instan")}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                {!gatewayEnabled && (
                  <p className="mt-3 text-xs text-amber-600">
                    {t("p7_Currently_disabled")}
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
                      {t("p7_Manual_Payment")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("p7_Send_to_bKash_Nagad_submit_Txn")}
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
                {t("p7_Clicking_below_redirects_you_t")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={startOnlinePayment} disabled={busyId === selected.id} className="h-11 font-bold">
                  {busyId === selected.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : (t("p7_Start_Online_Payment"))}
                </Button>
                <Button variant="outline" onClick={() => setPayMode("choose")} className="h-11">
                  {t("p7_Back")}
                </Button>
              </div>
            </div>
          )}

          {payMode === "manual" && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h3 className="text-base font-extrabold">
              {t("p7_Manual_Payment")}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setPayMode("choose")} className="ml-auto">
              {t("p7_Back_2")}
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("p7_Send_money_to_any_number_below")}
          </p>

          {/* Method cards */}
          {methods.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              {t("p7_No_payment_methods_configured_")}
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
                          <Copy className="h-3 w-3" /> {t("p7_Copy")}
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
                {t("p7_Selected_method")}
                <strong>{pickedMethod.name}</strong> · <code className="font-mono">{pickedMethod.account_number}</code>
              </div>
            )}
            <div>
              <Label htmlFor="txn">{t("p7_Transaction_ID_2")}</Label>
              <Input id="txn" value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="e.g. 7A1B2C3D" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="note">{t("p7_Note_optional")}</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1" />
            </div>
            <Button
              onClick={submitManual}
              disabled={submitting || !selected || !txnId.trim() || !pickedMethodId}
              className="h-11 w-full font-bold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (t("p7_Submit_Request"))}
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
