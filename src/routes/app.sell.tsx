import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/sell")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Sell" title={lang === "bn" ? "বেচা" : "Sell"} icon={icons.sell} />;
  },
});