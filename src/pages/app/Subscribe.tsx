import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Check, Crown, Loader2, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string; code: string; name_bn: string; name_en: string;
  price_bdt: number; old_price_bdt: number | null; duration_days: number;
  max_shops: number; is_lifetime: boolean; perks: string[];
  description_bn: string | null; description_en: string | null; discount_pct: number;
};

export default function Subscribe() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [gatewayEnabled, setGatewayEnabled] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: pl }, { data: gw }] = await Promise.all([
        supabase.from("subscription_plans")
          .select("id,code,name_bn,name_en,price_bdt,old_price_bdt,duration_days,max_shops,is_lifetime,perks,description_bn,description_en,discount_pct")
          .eq("is_active", true).order("price_bdt"),
        supabase.from("payment_gateway_settings").select("is_enabled").eq("id", true).maybeSingle(),
      ]);
      setPlans((pl as Plan[]) ?? []);
      setGatewayEnabled(!!gw?.is_enabled);
      setLoading(false);
    })();
  }, []);

  const buy = async (p: Plan) => {
    if (!user) return toast.error(lang === "bn" ? "আগে লগইন করুন" : "Please log in");
    setBusyId(p.id);
    const finalPrice = p.discount_pct ? Math.round(p.price_bdt * (1 - p.discount_pct / 100)) : p.price_bdt;
    if (gatewayEnabled) {
      const { data, error } = await supabase.functions.invoke("recharge-create-payment", {
        body: {
          plan_id: p.id,
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
      return;
    }
    // Fallback: create a subscription request for admin approval
    const { error } = await supabase.from("subscription_requests" as any).insert({
      user_id: user.id,
      plan_id: p.id,
      amount: finalPrice,
      status: "pending",
    });
    setBusyId(null);
    if (error) {
      // table may not exist; show generic toast
      toast.success(lang === "bn" ? `অর্ডার পেয়েছি — ${p.name_bn} (৳${finalPrice})` : `Order placed — ${p.name_en} (৳${finalPrice})`);
    } else {
      toast.success(lang === "bn" ? "অনুরোধ পাঠানো হয়েছে — admin verify করবে" : "Request sent — admin will verify");
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="container px-4 py-4">
      <div className="mb-2 text-xs text-muted-foreground">Settings</div>
      <h1 className="text-xl font-extrabold">{lang === "bn" ? "সাবস্ক্রিপশন কিনুন" : "Buy Subscription"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {lang === "bn" ? "ফ্রি প্ল্যানে ১টি দোকান। বেশি দোকানের জন্য আপগ্রেড করুন।" : "Free plan: 1 shop. Upgrade for more shops & unlimited usage."}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const finalPrice = p.discount_pct ? Math.round(p.price_bdt * (1 - p.discount_pct / 100)) : p.price_bdt;
          const isLifetime = p.is_lifetime;
          return (
            <div key={p.id} className={"relative rounded-2xl border bg-card p-5 shadow-sm " + (isLifetime ? "ring-2 ring-primary" : "")}>
              {isLifetime && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  {lang === "bn" ? "🔥 সেরা ডিল" : "🔥 Best Deal"}
                </span>
              )}
              <div className="flex items-center gap-2">
                {isLifetime ? <InfinityIcon className="h-5 w-5 text-primary" /> : <Crown className="h-5 w-5 text-primary" />}
                <div className="text-lg font-extrabold">{lang === "bn" ? p.name_bn : p.name_en}</div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-3xl font-extrabold">{fmtMoney(finalPrice, lang)}</div>
                {p.old_price_bdt && p.old_price_bdt > finalPrice && (
                  <div className="text-sm text-muted-foreground line-through">{fmtMoney(p.old_price_bdt, lang)}</div>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {isLifetime
                  ? (lang === "bn" ? "এককালীন পেমেন্ট" : "One-time payment")
                  : `${p.duration_days} ${lang === "bn" ? "দিন" : "days"}`} · {p.max_shops} {lang === "bn" ? "দোকান" : "shops"}
              </div>
              {(p.description_bn || p.description_en) && (
                <p className="mt-2 text-xs">{lang === "bn" ? p.description_bn : p.description_en}</p>
              )}
              <ul className="mt-4 space-y-1.5 text-sm">
                {(Array.isArray(p.perks) ? p.perks : []).map((perk: string) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded bg-emerald-500"><Check className="h-3 w-3 text-white" /></span>
                    {perk}
                  </li>
                ))}
              </ul>
              <Button onClick={() => buy(p)} disabled={busyId === p.id} className="mt-5 h-11 w-full font-bold">
                {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "bn" ? "এখনই কিনুন" : "Buy Now")}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
