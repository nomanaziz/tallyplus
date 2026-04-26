import { Link } from "@/lib/router";
import { useI18n, bnNum } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-shop.jpg";
import { icons } from "@/lib/icons";
import { TrendingUp, MessageCircle, ArrowRight } from "lucide-react";

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
          <div className="absolute inset-0 -z-10 mx-auto my-auto h-[85%] w-[85%] rounded-full bg-primary" aria-hidden />
          <img src={heroImg} alt={lang === "bn" ? "দোকানদার টালি প্লাস ব্যবহার করছেন" : "Shop owner using Tally Plus"} className="relative mx-auto rounded-3xl shadow-2xl ring-4 ring-background" width={1280} height={960} />
          {/* Floating chips with real icons */}
          <div className="absolute left-2 top-6 hidden rounded-2xl bg-card p-2 shadow-xl md:flex md:items-center md:gap-2">
            <img src={icons.businessReport} alt="" className="h-8 w-8" />
            <span className="pr-2 text-xs font-semibold">{lang === "bn" ? "ব্যবসার রিপোর্ট" : "Reports"}</span>
          </div>
          <div className="absolute right-0 top-16 hidden rounded-2xl bg-card p-2 shadow-xl md:flex md:items-center md:gap-2">
            <img src={icons.stock} alt="" className="h-8 w-8" />
            <span className="pr-2 text-xs font-semibold">{lang === "bn" ? "স্টকের হিসাব" : "Stock"}</span>
          </div>
          <div className="absolute bottom-10 left-0 hidden rounded-2xl bg-card p-2 shadow-xl md:flex md:items-center md:gap-2">
            <img src={icons.due} alt="" className="h-8 w-8" />
            <span className="pr-2 text-xs font-semibold">{lang === "bn" ? "বাড়তি আয়" : "Extra income"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}