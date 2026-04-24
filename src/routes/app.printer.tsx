import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/printer")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Printer" title={lang === "bn" ? "প্রিন্টার" : "Printer"} icon={icons.printer} />;
  },
});