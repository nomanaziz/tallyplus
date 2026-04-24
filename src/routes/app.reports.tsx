import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/reports")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Business Report" title={lang === "bn" ? "ব্যবসার রিপোর্ট" : "Business Report"} icon={icons.businessReport} />;
  },
});