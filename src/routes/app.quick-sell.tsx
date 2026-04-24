import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/quick-sell")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Quick Sell" title={lang === "bn" ? "দ্রুত বেচা" : "Quick Sell"} icon={icons.quickSell} />;
  },
});