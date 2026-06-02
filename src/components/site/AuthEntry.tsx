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
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/15 via-background to-background">
      <SiteHeader />

      <main className="site-container grid flex-1 gap-8 py-8 md:grid-cols-2 md:items-center md:gap-12 md:py-16">
        {/* Brand pitch */}
        <div className="order-2 md:order-1">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {t("ae_h1_prefix")} <span className="text-primary">{t("ae_personalLabel")}</span> {t("ae_h1_and")}
            <br /> <span className="text-primary">{t("ae_shopLabel")}</span> {t("ae_h1_suffix")}
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground md:text-lg">
            {t("ae_heroSub")}
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
                {t("ae_talkExpert")}
              </a>
            </Button>
          </div>
        </div>

        {/* Auth card */}
        <div className="relative order-1 md:order-2">
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
