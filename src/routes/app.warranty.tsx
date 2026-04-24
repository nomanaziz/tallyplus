import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/warranty")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Warranty" title={lang === "bn" ? "ওয়ারেন্টি পণ্য" : "Warranty"} icon={icons.warranty} />;
  },
});