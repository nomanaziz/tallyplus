import { Link } from "@/lib/router";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { LoginCard } from "./LoginCard";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ArrowRight, MessageCircle, Store, Wallet } from "lucide-react";

/**
 * Logged-out home: brand pitch (left) + LoginCard (right).
 * Uses the common SiteHeader / SiteFooter so the chrome matches the rest of the site.
 */
export function AuthEntry() {
  const { t, lang } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/15 via-background to-background">
      <SiteHeader />

      <main className="container mx-auto grid flex-1 gap-8 px-4 py-8 md:grid-cols-2 md:items-center md:gap-12 md:py-16">
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
          <div className="flex justify-center md:justify-end">
            <LoginCard />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
