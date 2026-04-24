import { Link } from "@tanstack/react-router";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Infinity as InfinityIcon } from "lucide-react";

type Plan = {
  code: string;
  bnName: string;
  enName: string;
  price: number;
  bnDuration: string;
  enDuration: string;
  bnPerks: string[];
  enPerks: string[];
  highlight?: boolean;
  badge?: { bn: string; en: string };
  lifetime?: boolean;
};

const PLANS: Plan[] = [
  {
    code: "monthly",
    bnName: "মাসিক",
    enName: "Monthly",
    price: 299,
    bnDuration: "৩০ দিন",
    enDuration: "30 days",
    bnPerks: ["সব ফিচার আনলক", "১টি দোকান", "আনলিমিটেড বিল ও প্রোডাক্ট", "ইমেইল সাপোর্ট"],
    enPerks: ["All features unlocked", "1 shop", "Unlimited bills & products", "Email support"],
  },
  {
    code: "half_yearly",
    bnName: "ষান্মাসিক",
    enName: "Half-Yearly",
    price: 1499,
    bnDuration: "১৮০ দিন",
    enDuration: "180 days",
    bnPerks: ["মাসিকের সব ফিচার", "১৭% সাশ্রয়", "WhatsApp সাপোর্ট", "অগ্রাধিকার সাপোর্ট"],
    enPerks: ["Everything in Monthly", "Save 17%", "WhatsApp support", "Priority support"],
  },
  {
    code: "yearly",
    bnName: "বার্ষিক",
    enName: "Yearly",
    price: 2499,
    bnDuration: "৩৬৫ দিন",
    enDuration: "365 days",
    bnPerks: ["মাসিকের সব ফিচার", "৩০% সাশ্রয়", "ফ্রি ট্রেনিং", "২৪/৭ সাপোর্ট"],
    enPerks: ["Everything in Monthly", "Save 30%", "Free training", "24/7 support"],
    highlight: true,
    badge: { bn: "জনপ্রিয়", en: "Popular" },
  },
  {
    code: "lifetime",
    bnName: "লাইফটাইম",
    enName: "Lifetime",
    price: 5000,
    bnDuration: "আজীবন",
    enDuration: "Forever",
    bnPerks: ["এককালীন পেমেন্ট", "কোনো রিনিউয়াল নেই", "সব আপডেট ফ্রি", "ভিআইপি সাপোর্ট", "সব ভবিষ্যৎ ফিচার"],
    enPerks: ["One-time payment", "No renewals ever", "All updates free", "VIP support", "All future features"],
    lifetime: true,
    badge: { bn: "🔥 সেরা ডিল", en: "🔥 Best Deal" },
  },
];

export function PricingSection() {
  const { lang } = useI18n();
  const { user } = useAuth();

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

        <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const isLifetime = !!p.lifetime;
            const ringClass = isLifetime
              ? "ring-2 ring-primary shadow-2xl bg-gradient-to-b from-primary/15 to-card"
              : p.highlight
                ? "ring-2 ring-foreground/80"
                : "";
            return (
              <div key={p.code} className={`relative rounded-3xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${ringClass}`}>
                {p.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold ${isLifetime ? "bg-foreground text-background" : "bg-primary text-primary-foreground"}`}>
                    {lang === "bn" ? p.badge.bn : p.badge.en}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {isLifetime && <InfinityIcon className="h-5 w-5 text-primary" />}
                  <h3 className="text-xl font-extrabold">{lang === "bn" ? p.bnName : p.enName}</h3>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{fmtMoney(p.price, lang)}</span>
                  <span className="text-sm text-muted-foreground">/ {lang === "bn" ? p.bnDuration : p.enDuration}</span>
                </div>
                {isLifetime && (
                  <p className="mt-1 text-xs font-semibold text-primary">
                    {lang === "bn" ? "এককালীন পেমেন্ট — আজীবন!" : "One-time payment — forever!"}
                  </p>
                )}
                <ul className="mt-6 space-y-2.5 text-sm">
                  {(lang === "bn" ? p.bnPerks : p.enPerks).map((x) => (
                    <li key={x} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/20">
                        <Check className="h-3 w-3" />
                      </span>
                      {x}
                    </li>
                  ))}
                </ul>
                <Button asChild className={`mt-6 h-11 w-full rounded-full text-base font-bold ${isLifetime ? "" : ""}`} variant={isLifetime || p.highlight ? "default" : "outline"}>
                  <Link to={user ? "/app" : "/auth"}>
                    {isLifetime
                      ? (lang === "bn" ? "এখনই কিনুন" : "Buy now")
                      : (lang === "bn" ? "শুরু করুন" : "Get started")}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          {lang === "bn"
            ? `সব প্ল্যানে ফ্রি আপডেট, বাংলা সাপোর্ট ও ${bnNum(7)} দিন মানি-ব্যাক গ্যারান্টি।`
            : "All plans include free updates, Bangla support and a 7-day money-back guarantee."}
        </p>
      </div>
    </section>
  );
}