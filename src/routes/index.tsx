import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import heroImg from "@/assets/hero-shop.jpg";
import featurePos from "@/assets/feature-pos.jpg";
import {
  ShoppingCart, Package, Users, Wallet, BarChart3, WifiOff, Bell, Globe, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tally Plus — দোকানের পুরো হিসাব এক অ্যাপে" },
      { name: "description", content: "POS, স্টক, বাকি, খরচ ও রিপোর্ট — মোবাইলে, বাংলায়, অফলাইনেও।" },
      { property: "og:title", content: "Tally Plus — দোকানের পুরো হিসাব এক অ্যাপে" },
      { property: "og:description", content: "POS, স্টক, বাকি, খরচ ও রিপোর্ট — মোবাইলে, বাংলায়, অফলাইনেও।" },
      { property: "og:image", content: heroImg },
    ],
  }),
  component: Index,
});

function Index() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const features = [
    { icon: ShoppingCart, bn: "দ্রুত POS বিলিং", en: "Lightning-fast POS" },
    { icon: Package, bn: "ইনভেন্টরি ও স্টক", en: "Inventory & stock" },
    { icon: Users, bn: "বাকির হিসাব", en: "Customer dues" },
    { icon: Wallet, bn: "খরচ ও আয়", en: "Income & expense" },
    { icon: BarChart3, bn: "ব্যবসার রিপোর্ট", en: "Business reports" },
    { icon: WifiOff, bn: "অফলাইনেও কাজ করে", en: "Works offline" },
    { icon: Bell, bn: "WhatsApp & Telegram", en: "WhatsApp & Telegram" },
    { icon: Globe, bn: "অনলাইন শপ", en: "Online shop page" },
  ];
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" aria-hidden />
        <div className="container relative mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold">
              POS · Inventory · Accounting
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">{t("tagline")}</h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">{t("heroSub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="text-base font-semibold">
                <Link to={user ? "/app" : "/auth"}>{t("getStarted")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base font-semibold">
                <Link to="/pricing">{t("pricing")}</Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {[
                lang === "bn" ? "১৪ দিন ফ্রি ট্রায়াল" : "14-day free trial",
                lang === "bn" ? "১ মিনিটে সেটআপ" : "Setup in 1 minute",
                lang === "bn" ? "বাংলা সাপোর্ট" : "Bangla support",
              ].map((x) => (
                <li key={x} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> {x}</li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/30 blur-3xl" aria-hidden />
            <img src={heroImg} alt="দোকানদার Tally Plus অ্যাপ ব্যবহার করছেন" className="rounded-3xl shadow-2xl" width={1280} height={960} />
          </div>
        </div>
      </section>
      <section id="features" className="container mx-auto px-4 py-16 md:py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">{lang === "bn" ? "সব এক অ্যাপে" : "Everything in one app"}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {lang === "bn" ? "তালি খাতার সরলতা, ডিজিটালের গতি।" : "Simplicity of a tally book, speed of digital."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {features.map((f) => (
            <div key={f.bn} className="group rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20 transition-colors group-hover:bg-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <p className="font-semibold">{lang === "bn" ? f.bn : f.en}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-gradient-to-b from-secondary/40 to-transparent py-16 md:py-24">
        <div className="container mx-auto grid gap-10 px-4 md:grid-cols-2 md:items-center">
          <img src={featurePos} alt="POS billing" className="rounded-3xl shadow-xl" loading="lazy" width={1024} height={1024} />
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">
              {lang === "bn" ? "৩০ সেকেন্ডে বিল, এক ক্লিকে রিপোর্ট" : "Bill in 30s, report in one click"}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {lang === "bn"
                ? "বারকোড স্ক্যান, ডিসকাউন্ট, বাকি ও পেমেন্ট অপশন একসাথে। দিনের শেষে এক ক্লিকে ক্যাশ বুক, লাভ-ক্ষতি ও স্টকের রিপোর্ট।"
                : "Scan barcodes for quick billing, with discounts, dues and split payments. End-of-day cashbook, P&L and stock — all in one tap."}
            </p>
            <div className="mt-6"><Button asChild size="lg"><Link to={user ? "/app" : "/auth"}>{t("getStarted")}</Link></Button></div>
          </div>
        </div>
      </section>
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-8 text-center shadow-xl md:p-14">
          <h2 className="text-3xl font-bold text-primary-foreground md:text-4xl">
            {lang === "bn" ? "আজই শুরু করুন, ১ মিনিটে।" : "Start today, in 1 minute."}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            {lang === "bn" ? "মোবাইল নাম্বার দিয়ে লগইন করুন — কার্ড লাগবে না।" : "Login with your mobile — no card needed."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg" variant="secondary"><Link to={user ? "/app" : "/auth"}>{t("getStarted")}</Link></Button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
