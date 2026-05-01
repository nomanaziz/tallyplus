import { Link } from "@/lib/router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HeroSection } from "@/components/site/HeroSection";
import { FeatureRows } from "@/components/site/FeatureRows";
import { PainAndSolutions } from "@/components/site/PainAndSolutions";
import { CompareTable } from "@/components/site/CompareTable";
import { BusinessTypes } from "@/components/site/BusinessTypes";
import { Testimonials } from "@/components/site/Testimonials";
import { PricingSection } from "@/components/site/PricingSection";
import { ContactSection } from "@/components/site/ContactSection";
import { StatsStrip, FinalCta } from "@/components/site/StatsAndCta";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export default function About() {
  const { t } = useI18n();
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {!user && (
        <div className="border-b bg-muted/40">
          <div className="container mx-auto px-4 py-2 text-sm">
            <Link to="/" className="text-primary hover:underline">
              {t("backToLogin")}
            </Link>
          </div>
        </div>
      )}
      <HeroSection />
      <FeatureRows />
      <PainAndSolutions />
      <CompareTable />
      <BusinessTypes />
      <Testimonials />
      <PricingSection />
      <ContactSection />
      <StatsStrip />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}