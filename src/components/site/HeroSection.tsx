import { Link } from "@/lib/router";
import { useI18n, bnNum } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { TrendingUp, MessageCircle, ArrowRight } from "lucide-react";
import { LoginCard } from "./LoginCard";
import { usePublicStats } from "@/lib/use-public-stats";

export function HeroSection() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const stats = usePublicStats();
  const fmt = (n: number) => (lang === "bn" ? bnNum(n) : String(n));
  const dash = stats.isLoading ? "—" : null;
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-background" aria-hidden />
      <div className="container relative mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-20">
        <div className="order-2 md:order-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-primary/30">
            <TrendingUp className="h-3.5 w-3.5" />
            {lang === "bn" ? "৫+ বছরের অভিজ্ঞতা · ২৪/৭ এক্সপার্ট সাপোর্ট" : "5+ years of experience · 24/7 expert support"}
          </span>
          <h2 className="mt-4 text-base font-semibold text-muted-foreground">
            {lang === "bn" ? "ব্যক্তিগত হিসাব হোক বা দোকান — সবই এক অ্যাপে।" : "Personal finances or your shop — all in one app."}
          </h2>
          <h1 className="mt-2 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            {lang === "bn" ? "টালি প্লাসে" : "Track it all"} <br />
            <span className="text-primary">{lang === "bn" ? "ব্যক্তিগত ও দোকান, একসাথে" : "with Tally Plus"}</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
            {lang === "bn"
              ? "ব্যক্তিগত আয়-ব্যয়, দেনা-পাওনা ও ফর্দ — অথবা পূর্ণাঙ্গ POS, স্টক, বাকি, কর্মচারী, রিপোর্ট। অফলাইনেও কাজ করে।"
              : "Personal income–expense, lending and wishlist — or a full POS, stock, dues, employees and reports. Works offline too."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-6 text-base font-bold">
              <Link to={user ? "/app" : "/"} search={user ? undefined : { role: "owner", mode: "signup" }}>
                {t("shopSignupCta")} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-12 rounded-full px-6 text-base font-bold">
              <Link to={user ? "/customer/dashboard" : "/"} search={user ? undefined : { role: "customer", mode: "signup" }}>
                {t("personalSignupCta")} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-foreground/15 px-6 text-base font-semibold">
              <a href="https://wa.me/8801841577944?text=Hello" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" />
                {lang === "bn" ? "এক্সপার্টের সাথে কথা বলুন" : "Talk to an Expert"}
              </a>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-10">
            <div>
              <div className="text-2xl font-extrabold md:text-3xl">{dash ?? fmt(stats.totalUsers)}</div>
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "মোট ব্যবহারকারী" : "Total users"}</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold md:text-3xl">{dash ?? fmt(stats.shops)}</div>
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "নিবন্ধিত দোকান" : "Shops registered"}</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold md:text-3xl">{dash ?? fmt(stats.customers)}</div>
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "গ্রাহক" : "Customers"}</div>
            </div>
          </div>
        </div>
        <div className="relative order-1 md:order-2">
          <div className="absolute inset-0 -z-10 mx-auto my-auto h-[90%] w-[90%] rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-2xl" aria-hidden />
          <div className="mx-auto flex justify-center">
            <LoginCard />
          </div>
        </div>
      </div>
    </section>
  );
}