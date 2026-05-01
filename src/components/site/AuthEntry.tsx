import { Link } from "@/lib/router";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { HeroAuthCard } from "./HeroAuthCard";
import logo from "@/assets/logo.png";
import { ArrowRight, MessageCircle, Store, ShoppingBag, Wallet, Receipt } from "lucide-react";
import { LangToggle } from "@/components/site/LangToggle";
import { ThemeToggle } from "@/components/site/ThemeToggle";

/**
 * Facebook-style entry screen for logged-out visitors.
 * Left: brand pitch (Personal + Shop dual positioning).
 * Right: existing HeroAuthCard (login/signup form).
 * Bottom: small link row + CTA to the full landing /about page.
 */
export function AuthEntry() {
  const { t, lang } = useI18n();
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-background to-background">
      {/* Compact top bar */}
      <header className="sticky top-0 z-30 w-full border-b bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-3 md:px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Tally Plus" width={32} height={32} className="h-7 w-7 object-contain" />
            <span className="text-lg font-extrabold tracking-tight">{t("appName")}</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto grid gap-8 px-4 py-8 md:grid-cols-2 md:items-center md:gap-12 md:py-16">
        {/* Brand pitch */}
        <div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {lang === "bn" ? (
              <>
                আপনার <span className="text-primary">ব্যক্তিগত হিসাব</span> ও
                <br /> <span className="text-primary">দোকানের হিসাব</span> — এক অ্যাপেই
              </>
            ) : (
              <>
                Your <span className="text-primary">personal finances</span> &
                <br /> <span className="text-primary">shop accounting</span> — one app
              </>
            )}
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground md:text-lg">
            {lang === "bn"
              ? "ব্যক্তিগত আয়-ব্যয়, দেনা-পাওনা ও ফর্দ থেকে শুরু করে পূর্ণাঙ্গ দোকান POS — সব এখানে।"
              : "From personal income–expense, lending and wishlist to a full-featured shop POS — all here."}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-card/70 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Wallet className="h-4 w-4 text-primary" />
                {t("personalUse")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("personalUseHint")}</p>
            </div>
            <div className="rounded-2xl border bg-card/70 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Store className="h-4 w-4 text-primary" />
                {t("shopUse")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("shopUseHint")}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-5 text-sm font-semibold">
              <Link to="/about">
                {t("learnAboutTallyPlus")} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-5 text-sm font-semibold">
              <a href="https://wa.me/8801841577944?text=Hello" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" />
                {lang === "bn" ? "এক্সপার্টের সাথে কথা বলুন" : "Talk to an Expert"}
              </a>
            </Button>
          </div>
        </div>

        {/* Auth card */}
        <div className="relative">
          <div className="absolute inset-0 -z-10 mx-auto my-auto h-[90%] w-[90%] rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-2xl" aria-hidden />
          <HeroAuthCard />
        </div>
      </main>

      {/* Footer link row — Facebook-style mini menu */}
      <footer className="border-t bg-background/60 py-4">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 text-xs text-muted-foreground">
          <Link to="/about" className="hover:text-foreground hover:underline">
            {lang === "bn" ? "টালি প্লাস সম্পর্কে" : "About Tally Plus"}
          </Link>
          <Link to="/shop" className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
            <ShoppingBag className="h-3 w-3" />
            {lang === "bn" ? "মার্কেটপ্লেস" : "Marketplace"}
          </Link>
          <Link to="/pricing" className="hover:text-foreground hover:underline">
            {lang === "bn" ? "মূল্য তালিকা" : "Pricing"}
          </Link>
          <Link to="/customer/my-fordo" className="inline-flex items-center gap-1 hover:text-foreground hover:underline">
            <Receipt className="h-3 w-3" />
            {lang === "bn" ? "ফর্দ" : "Fordo"}
          </Link>
          <Link to="/privacy" className="hover:text-foreground hover:underline">
            {lang === "bn" ? "গোপনীয়তা" : "Privacy"}
          </Link>
          <Link to="/terms" className="hover:text-foreground hover:underline">
            {lang === "bn" ? "শর্তাবলী" : "Terms"}
          </Link>
        </div>
        <div className="container mx-auto mt-2 px-4 text-center text-[11px] text-muted-foreground/70">
          © {new Date().getFullYear()} {t("appName")}
        </div>
      </footer>
    </div>
  );
}