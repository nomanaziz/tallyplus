import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "প্রাইসিং — Tally Plus" },
      { name: "description", content: "মাসিক, ষান্মাসিক ও বার্ষিক প্ল্যান।" },
      { property: "og:title", content: "Tally Plus Pricing" },
      { property: "og:description", content: "Monthly, half-yearly and yearly plans." },
    ],
  }),
  component: Pricing,
});

type Plan = { id: string; code: string; name_bn: string; name_en: string; price_bdt: number; duration_days: number };

function Pricing() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => {
    supabase.from("subscription_plans").select("*").eq("is_active", true).order("duration_days").then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);
  const perks = lang === "bn"
    ? ["সব ফিচার আনলক", "অসীমিত প্রোডাক্ট ও বিল", "অফলাইন সিঙ্ক", "WhatsApp/Telegram অ্যালার্ট", "প্রোরিটি সাপোর্ট"]
    : ["All features unlocked", "Unlimited products & bills", "Offline sync", "WhatsApp/Telegram alerts", "Priority support"];
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold md:text-5xl">{t("pricing")}</h1>
          <p className="mt-3 text-muted-foreground">{lang === "bn" ? "যেকোনো প্ল্যান নিন, যেকোনো সময় বদলান।" : "Pick any plan, change anytime."}</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          {plans.map((p, i) => (
            <div key={p.id} className={`relative rounded-3xl border bg-card p-6 shadow-sm ${i === 1 ? "ring-2 ring-primary md:scale-105" : ""}`}>
              {i === 1 && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  {lang === "bn" ? "জনপ্রিয়" : "Popular"}
                </span>
              )}
              <h3 className="text-xl font-bold">{lang === "bn" ? p.name_bn : p.name_en}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{fmtMoney(Number(p.price_bdt), lang)}</span>
                <span className="text-muted-foreground">/ {lang === "bn" ? bnNum(p.duration_days) : p.duration_days} {t("days")}</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {perks.map((x) => (
                  <li key={x} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" /> {x}</li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={i === 1 ? "default" : "outline"}>
                <Link to={user ? "/app" : "/auth"}>{t("getStarted")}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}