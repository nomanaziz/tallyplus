import { Link } from "@/lib/router";
import { useI18n, bnNum } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Download, Globe } from "lucide-react";
import { usePublicStats } from "@/lib/use-public-stats";

export function StatsStrip() {
  const { lang } = useI18n();
  const s = usePublicStats();
  const fmt = (n: number) => (s.isLoading ? "—" : lang === "bn" ? bnNum(n) : String(n));
  const items = lang === "bn"
    ? [
        { v: fmt(s.totalUsers), l: "মোট ব্যবহারকারী" },
        { v: fmt(s.shops), l: "নিবন্ধিত দোকান" },
        { v: fmt(s.customers), l: "গ্রাহক" },
      ]
    : [
        { v: fmt(s.totalUsers), l: "Total users" },
        { v: fmt(s.shops), l: "Shops registered" },
        { v: fmt(s.customers), l: "Customers" },
      ];
  return (
    <section className="border-y bg-primary/10">
      <div className="site-container grid grid-cols-3 gap-4 py-10 text-center">
        {items.map((x) => (
          <div key={x.l}>
            <div className="text-2xl font-extrabold md:text-4xl">{x.v}</div>
            <div className="mt-1 text-xs text-muted-foreground md:text-sm">{x.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  const { lang } = useI18n();
  const { user } = useAuth();
  return (
    <section className="site-container py-16 md:py-24">
      <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-8 text-center shadow-xl md:p-14">
        <h2 className="text-3xl font-extrabold text-primary-foreground md:text-5xl">
          {lang === "bn" ? <>সাফল্যের যাত্রা <span className="underline decoration-foreground/40 decoration-4 underline-offset-4">শুরু করুন</span></> : <>Start your <span className="underline decoration-foreground/40 decoration-4 underline-offset-4">journey</span> to success</>}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
          {lang === "bn" ? "জীবন বদলানোর দায়িত্ব আপনার হাতে। আজই ইনস্টল করুন।" : "The responsibility to change your life is in your hands. Install today."}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-12 rounded-full bg-foreground px-6 text-base font-bold text-background hover:bg-foreground/90">
            <a href="#"><Download className="mr-1.5 h-4 w-4" />{lang === "bn" ? "ডাউনলোড" : "Download"}</a>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-foreground/30 bg-transparent px-6 text-base font-bold text-primary-foreground hover:bg-primary-foreground/10">
            <Link to={user ? "/app" : "/"}><Globe className="mr-1.5 h-4 w-4" />{lang === "bn" ? "ওয়েব ভার্সন" : "Use the web version"}</Link>
          </Button>
        </div>
        <p className="mt-5 text-sm text-primary-foreground/80">
          {lang === "bn" ? "৭ দিনের ফ্রি ট্রায়াল · ফ্রি ট্রেনিং ও টেক সাপোর্ট" : "7-day trial · Free training & tech support"}
        </p>
      </div>
    </section>
  );
}