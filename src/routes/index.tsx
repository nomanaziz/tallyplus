import { createFileRoute } from "@tanstack/react-router";
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
