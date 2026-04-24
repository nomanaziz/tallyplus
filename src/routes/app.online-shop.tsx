import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/online-shop")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Online Shop" title={lang === "bn" ? "অনলাইন শপ" : "Online Shop"} icon={icons.onlineShop} />;
  },
});