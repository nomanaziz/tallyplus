import { Link } from "@/lib/router";
import { useI18n, bnNum } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { TrendingUp, MessageCircle, ArrowRight } from "lucide-react";
import { HeroAuthCard } from "./HeroAuthCard";

export function HeroSection() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const million = lang === "bn" ? `${bnNum(10)},০০,০০০+` : "1,000,000+";
  const rating = lang === "bn" ? `${bnNum(4.4)}★` : "4.4★";
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-background" aria-hidden />
      <div className="container relative mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-primary/30">
            <TrendingUp className="h-3.5 w-3.5" />
            {lang === "bn" ? "৫+ বছরের অভিজ্ঞতা · ২৪/৭ এক্সপার্ট সাপোর্ট" : "5+ years of experience · 24/7 expert support"}
          </span>
          <h2 className="mt-4 text-base font-semibold text-muted-foreground">
            {lang === "bn" ? "স্মার্টভাবে ব্যবসা করুন।" : "Run a smarter business."}
          </h2>
          <h1 className="mt-2 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            {lang === "bn" ? "ব্যবসা বাড়ান" : "Grow Your Business"} <br />
            <span className="text-primary">{lang === "bn" ? "টালি প্লাসের সাথে।" : "With Tally Plus."}</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">{t("heroSub")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-6 text-base font-bold">
              <Link to={user ? "/app" : "/auth"}>
                {t("getStarted")} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-foreground/15 px-6 text-base font-semibold">
              <a href="https://wa.me/8801841577944?text=Hello" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" />
                {lang === "bn" ? "এক্সপার্টের সাথে কথা বলুন" : "Talk to an Expert"}
              </a>
            </Button>
          </div>
          <div className="mt-10 flex gap-10">
            <div>
              <div className="text-2xl font-extrabold md:text-3xl">{million}</div>
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "ব্যবসায়ী ব্যবহার করছেন" : "Businessman using"}</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold md:text-3xl">{rating}</div>
              <div className="text-xs text-muted-foreground">{lang === "bn" ? "অ্যাপ রেটিং" : "App Rating"}</div>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 -z-10 mx-auto my-auto h-[90%] w-[90%] rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-2xl" aria-hidden />
          <HeroAuthCard />
        </div>
      </div>
    </section>
  );
}