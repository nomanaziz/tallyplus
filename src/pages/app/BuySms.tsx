import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, MessageSquareText, Loader2, Check, Wallet, Copy,
  ArrowRight, CreditCard, Smartphone,
} from "lucide-react";
import { toast } from "sonner";

type SmsPackage = {
  id: string;
  name_bn: string;
  name_en: string | null;
  sms_count: number;
  price_bdt: number;
  is_active: boolean;
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

export default function BuySmsPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const { user } = useAuth();
  const nav = useNavigate();

  const [selected, setSelected] = useState<SmsPackage | null>(null);
  const [payMode, setPayMode] = useState<"choose" | "online" | "manual">("choose");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [txnId, setTxnId] = useState("");
  const [note, setNote] = useState("");
  const [pickedMethodId, setPickedMethodId] = useState<string | null>(null);

  const { data: pkgs = [] } = useQuery({
    queryKey: ["sms_packages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sms_packages")
        .select("*")
        .eq("is_active", true)
        .order("sms_count");
      return (data ?? []) as SmsPackage[];
    },
  });

  const { data: bal } = useQuery({
    queryKey: ["sms_balance", current?.id],
    enabled: !!current?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("shop_sms_balance")
        .select("*")
        .eq("shop_id", current!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: gateway } = useQuery({
    queryKey: ["payment_gateway_settings"],
    queryFn: async () => {
      const { data } = await supabase.rpc("payment_gateway_public").maybeSingle();
      return data;
    },
  });
  const gatewayEnabled = !!gateway?.is_enabled;

  const { data: methods = [] } = useQuery({
    queryKey: ["payment_methods_active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at");
      return (data ?? []) as PaymentMethodRow[];
    },
  });

  useEffect(() => {
    if (methods.length > 0 && !pickedMethodId) setPickedMethodId(methods[0].id);
  }, [methods, pickedMethodId]);

  const handlePick = (p: SmsPackage) => {
    if (!user) {
      toast.error(lang === "bn" ? "আগে লগইন করুন" : "Please log in");
      return;
    }
    if (!current?.id) {
      toast.error(lang === "bn" ? "দোকান নির্বাচন করুন" : "Select a shop");
      return;
    }
    setSelected(p);
    setPayMode("choose");
    setTimeout(() => {
      document.getElementById("sms-pay-step")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const startOnline = async () => {
    if (!user || !selected || !current?.id) return;
    setBusyId(selected.id);
    const { data, error } = await supabase.functions.invoke("sms-create-payment", {
      body: {
        package_id: selected.id,
        shop_id: current.id,
        origin: window.location.origin,
        phone: user.phone ?? user.email ?? "",
      },
    });
    setBusyId(null);
    if (error || !data?.payment_url) {
      toast.error(error?.message ?? data?.error ?? (lang === "bn" ? "পেমেন্ট তৈরি করা যায়নি" : "Could not create payment"));
      return;
    }
    window.location.href = data.payment_url as string;
  };

  const submitManual = async () => {
    if (!user || !selected || !current?.id) return;
    if (!txnId.trim()) {
      toast.error(lang === "bn" ? "TxnID দিন" : "Please enter Transaction ID");
      return;
    }
    const picked = methods.find((m) => m.id === pickedMethodId);
    if (!picked) {
      toast.error(lang === "bn" ? "একটি পেমেন্ট মাধ্যম নির্বাচন করুন" : "Pick a payment method");
      return;
    }
    const lower = picked.name.toLowerCase();
    let pm = picked.type || "other";
    if (lower.includes("bkash")) pm = "bkash";
    else if (lower.includes("nagad")) pm = "nagad";
    else if (lower.includes("rocket")) pm = "rocket";

    const noteWithMethod = `[${picked.name} • ${picked.account_number}]${note.trim() ? "\n" + note.trim() : ""}`;
    setSubmitting(true);
    const { error } = await supabase.from("sms_purchase_requests").insert({
      shop_id: current.id,
      user_id: user.id,
      package_id: selected.id,
      sms_count: selected.sms_count,
      amount_bdt: selected.price_bdt,
      payment_status: "pending",
      payment_method: pm,
      txn_id: txnId.trim(),
      admin_note: noteWithMethod,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(lang === "bn" ? "অনুরোধ পাঠানো হয়েছে — admin verify করবে" : "Request sent — admin will verify");
    setTxnId(""); setNote(""); setSelected(null); setPayMode("choose");
  };

  const copy = (text?: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast.success(lang === "bn" ? "কপি হয়েছে" : "Copied");
  };

  const pickedMethod = useMemo(
    () => methods.find((m) => m.id === pickedMethodId) ?? null,
    [methods, pickedMethodId],
  );

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={lang === "bn" ? "SMS কিনুন" : "Buy SMS"}
        title={
          <span className="flex items-center gap-2">
            <button onClick={() => nav({ to: "/app/marketing" })} className="-ml-1 flex h-7 w-7 items-center justify-center rounded hover:bg-accent" aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>
            {lang === "bn" ? "SMS কিনুন" : "Buy SMS"}
          </span>
        }
      />
      <div className="container px-3 py-4 sm:px-4">
        {/* Balance card */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "বর্তমান SMS ব্যালেন্স" : "Current SMS Balance"}</div>
              <div className="text-2xl font-extrabold">{bal?.balance ?? 0}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {lang === "bn" ? "মোট ক্রয়" : "Total purchased"}: {bal?.total_purchased ?? 0} • {lang === "bn" ? "ব্যবহৃত" : "Used"}: {bal?.total_used ?? 0}
          </div>
        </div>

        {/* Step 1 — Packages */}
        <h2 className="mb-3 text-lg font-bold">{lang === "bn" ? "প্যাকেজ নির্বাচন করুন" : "Choose a Package"}</h2>
        {pkgs.length === 0 ? (
          <div className="rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">
            {lang === "bn" ? "এখনো কোনো প্যাকেজ নেই। অ্যাডমিন শীঘ্রই যোগ করবে।" : "No packages yet. Admin will add them soon."}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pkgs.map((p) => {
              const perSms = (Number(p.price_bdt) / Number(p.sms_count)).toFixed(2);
              const isSelected = selected?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={"rounded-xl border bg-background p-4 transition hover:shadow-md " + (isSelected ? "ring-2 ring-primary" : "")}
                >
                  <div className="text-sm font-semibold text-muted-foreground">{p.name_bn}</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold">{Number(p.sms_count).toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">SMS</span>
                  </div>
                  <div className="mt-1 text-2xl font-bold text-emerald-600">৳{p.price_bdt}</div>
                  <div className="mt-1 text-xs text-muted-foreground">৳{perSms}/SMS</div>
                  <Button
                    onClick={() => handlePick(p)}
                    className="mt-3 h-11 w-full font-bold"
                    variant={isSelected ? "outline" : "default"}
                  >
                    {isSelected ? (lang === "bn" ? "নির্বাচিত" : "Selected") : (lang === "bn" ? "কিনুন" : "Buy")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 2 — Choose payment method */}
        {selected && (
          <div id="sms-pay-step" className="mt-6 rounded-2xl border bg-background p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold">
                {lang === "bn" ? "পেমেন্ট পদ্ধতি বেছে নিন" : "Choose how to pay"}
              </h2>
              <div className="rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
                {lang === "bn" ? "প্যাকেজ:" : "Package:"}{" "}
                <strong>{selected.sms_count.toLocaleString()} SMS</strong> —{" "}
                <strong>৳{selected.price_bdt}</strong>
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
                      <div className="font-extrabold">{lang === "bn" ? "অনলাইন পেমেন্ট" : "Pay Online"}</div>
                      <div className="text-xs text-muted-foreground">
                        {lang === "bn" ? "Card / bKash / Nagad / Rocket — তাত্ক্ষণিক balance" : "Card / bKash / Nagad / Rocket — instant balance"}
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
                      <div className="font-extrabold">{lang === "bn" ? "ম্যানুয়াল পেমেন্ট" : "Manual Payment"}</div>
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
                    ? "নিচের button-এ click করলে আপনাকে secure payment page-এ নিয়ে যাবে। সফল payment-এর পর automatic আপনার SMS balance যোগ হবে।"
                    : "Clicking below redirects you to a secure payment page. Your SMS balance will be credited automatically once paid."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={startOnline} disabled={busyId === selected.id} className="h-11 font-bold">
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
                  <h3 className="text-base font-extrabold">{lang === "bn" ? "ম্যানুয়াল পেমেন্ট" : "Manual Payment"}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setPayMode("choose")} className="ml-auto">
                    {lang === "bn" ? "← ফিরে যান" : "← Back"}
                  </Button>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lang === "bn"
                    ? "নিচের যেকোনো নম্বরে টাকা পাঠান, তারপর Transaction ID দিন। admin verify করে SMS balance যোগ করবে।"
                    : "Send money to any number below, then submit the Transaction ID. Admin will verify and credit balance."}
                </p>

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

        <div className="mt-6 rounded-md border bg-blue-50 p-3 text-xs text-blue-900">
          <Check className="mr-1 inline h-3 w-3" />
          {lang === "bn"
            ? "অনলাইন পেমেন্ট সফল হলে SMS balance তাৎক্ষণিক যোগ হয়। ম্যানুয়াল পেমেন্ট admin verify করার পর যোগ হবে।"
            : "Online payments credit your SMS balance instantly. Manual payments are added after admin verification."}
        </div>
      </div>
    </div>
  );
}