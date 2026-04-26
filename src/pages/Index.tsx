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
import heroImg from "@/assets/hero-shop.jpg";



function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
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

export default Index;
