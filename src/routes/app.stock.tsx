import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/stock")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Stock Management" title={lang === "bn" ? "স্টকের হিসাব" : "Stock"} icon={icons.stock} />;
  },
});