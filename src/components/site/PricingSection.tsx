import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, Infinity as InfinityIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string;
  code: string;
  name_bn: string;
  name_en: string;
  price_bdt: number;
  old_price_bdt: number | null;
  duration_days: number;
  max_shops: number;
  is_lifetime: boolean;
  perks: string[] | null;
  description_bn: string | null;
  description_en: string | null;
  discount_pct: number | null;
};

const FREE_LIMITS_BN = "পণ্য ১০ • বিক্রয় ১০ • ক্রয় ১০ • খরচ ১০ • গ্রাহক ৫ • সাপ্লায়ার ৫";
const FREE_LIMITS_EN = "10 products • 10 sales • 10 purchases • 10 expenses • 5 customers • 5 suppliers";

export function PricingSection() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: pl }, { data: gw }] = await Promise.all([
        supabase
          .from("subscription_plans")
          .select("id,code,name_bn,name_en,price_bdt,old_price_bdt,duration_days,max_shops,is_lifetime,perks,description_bn,description_en,discount_pct")
          .eq("is_active", true)
          .order("price_bdt"),
        supabase.from("payment_gateway_settings").select("is_enabled").eq("id", true).maybeSingle(),
      ]);
      setPlans((pl as Plan[]) ?? []);
      setGatewayEnabled(!!gw?.is_enabled);
      setLoading(false);
    })();
  }, []);

  const finalPrice = (p: Plan) =>
    p.discount_pct ? Math.round(p.price_bdt * (1 - p.discount_pct / 100)) : p.price_bdt;

  const handlePick = async (p: Plan) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (gatewayEnabled) {
      setBusyId(p.id);
      const { data, error } = await supabase.functions.invoke("recharge-create-payment", {
        body: { plan_id: p.id, origin: window.location.origin, phone: user.phone ?? user.email ?? "" },
      });
      setBusyId(null);
      if (error || !data?.payment_url) {
        toast.error(error?.message ?? data?.error ?? (lang === "bn" ? "পেমেন্ট তৈরি করা যায়নি — Subscribe page থেকে চেষ্টা করুন" : "Could not start payment — try from Subscribe page"));
        navigate({ to: "/app/subscribe" });
        return;
      }
      window.location.href = data.payment_url as string;
      return;
    }
    navigate({ to: "/app/subscribe" });
  };

  // Highlight: highest-priced non-lifetime plan; lifetime gets its own emphasis
  const hasLifetime = plans.some((p) => p.is_lifetime);
  const topPaidId = (() => {
    const nonLife = plans.filter((p) => !p.is_lifetime);
    if (nonLife.length === 0) return null;
    return nonLife[nonLife.length - 1].id;
  })();

  return (
    <section id="pricing" className="scroll-mt-20 bg-secondary/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold ring-1 ring-primary/30">
            <Sparkles className="h-3.5 w-3.5" />
            {lang === "bn" ? "৭ দিনের ফ্রি ট্রায়াল" : "7-day free trial"}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold md:text-5xl">
            {lang === "bn" ? <>সহজ, <span className="text-primary">স্বচ্ছ প্রাইসিং</span></> : <>Simple, <span className="text-primary">transparent pricing</span></>}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {lang === "bn" ? "কোনো হিডেন ফি নেই। যেকোনো সময় ক্যান্সেল করুন।" : "No hidden fees. Cancel anytime."}
          </p>
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              {lang === "bn" ? "শীঘ্রই প্ল্যান প্রকাশ হবে।" : "Plans will be published soon."}
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to={user ? "/app/subscribe" : "/auth"}>
                {lang === "bn" ? "যোগাযোগ করুন" : "Contact us"}
              </Link>
            </Button>
          </div>
        ) : (
          <div className={`mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2 ${plans.length >= 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {/* Free plan card */}
            <div className="relative rounded-3xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                <h3 className="text-xl font-extrabold">{lang === "bn" ? "ফ্রি" : "Free"}</h3>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">৳ 0</span>
                <span className="text-sm text-muted-foreground">/ {lang === "bn" ? "চিরকাল" : "forever"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{lang === "bn" ? "১টি দোকান" : "1 shop"}</p>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {lang === "bn" ? FREE_LIMITS_BN : FREE_LIMITS_EN}
              </p>
              <Button asChild variant="outline" className="mt-6 h-11 w-full rounded-full text-base font-bold">
                <Link to={user ? "/app/dashboard" : "/auth"}>
                  {lang === "bn" ? "ফ্রি শুরু করুন" : "Start free"}
                </Link>
              </Button>
            </div>

            {plans.map((p) => {
              const fp = finalPrice(p);
              const isLifetime = p.is_lifetime;
              const isHighlight = !hasLifetime && p.id === topPaidId;
              const ringClass = isLifetime
                ? "ring-2 ring-primary shadow-2xl bg-gradient-to-b from-primary/15 to-card"
                : isHighlight
                  ? "ring-2 ring-foreground/80"
                  : "";
              return (
                <div key={p.id} className={`relative rounded-3xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${ringClass}`}>
                  {isLifetime ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">
                      {lang === "bn" ? "🔥 সেরা ডিল" : "🔥 Best Deal"}
                    </span>
                  ) : isHighlight ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                      {lang === "bn" ? "জনপ্রিয়" : "Popular"}
                    </span>
                  ) : null}
                  <div className="flex items-center gap-2">
                    {isLifetime ? <InfinityIcon className="h-5 w-5 text-primary" /> : <Crown className="h-5 w-5 text-primary" />}
                    <h3 className="text-xl font-extrabold">{lang === "bn" ? p.name_bn : p.name_en}</h3>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold">{fmtMoney(fp, lang)}</span>
                    {p.old_price_bdt && p.old_price_bdt > fp && (
                      <span className="text-sm text-muted-foreground line-through">{fmtMoney(p.old_price_bdt, lang)}</span>
                    )}
                  </div>
                  {p.old_price_bdt && p.old_price_bdt > fp && (
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {lang === "bn" ? "সাশ্রয়" : "Save"} {fmtMoney(p.old_price_bdt - fp, lang)}
                      <span className="opacity-80">
                        {" "}({Math.round(((p.old_price_bdt - fp) / p.old_price_bdt) * 100)}%)
                      </span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isLifetime
                      ? (lang === "bn" ? "এককালীন পেমেন্ট — আজীবন!" : "One-time — forever!")
                      : `${p.duration_days} ${lang === "bn" ? "দিন" : "days"} · ${p.max_shops} ${lang === "bn" ? "দোকান" : "shop(s)"}`}
                  </p>
                  {(p.description_bn || p.description_en) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {lang === "bn" ? p.description_bn : p.description_en}
                    </p>
                  )}
                  <ul className="mt-6 space-y-2.5 text-sm">
                    {(Array.isArray(p.perks) ? p.perks : []).slice(0, 6).map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/20">
                          <Check className="h-3 w-3" />
                        </span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handlePick(p)}
                    disabled={busyId === p.id}
                    className="mt-6 h-11 w-full rounded-full text-base font-bold"
                    variant={isLifetime || isHighlight ? "default" : "outline"}
                  >
                    {busyId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : !user ? (
                      lang === "bn" ? "শুরু করুন" : "Get started"
                    ) : gatewayEnabled ? (
                      lang === "bn" ? "এখনই কিনুন" : "Buy now"
                    ) : (
                      lang === "bn" ? "সাবস্ক্রাইব করুন" : "Subscribe"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-muted-foreground">
          {lang === "bn"
            ? "সব প্ল্যানে ফ্রি আপডেট, বাংলা সাপোর্ট ও ৭ দিন মানি-ব্যাক গ্যারান্টি।"
            : "All plans include free updates, Bangla support and a 7-day money-back guarantee."}
        </p>
      </div>
    </section>
  );
}
