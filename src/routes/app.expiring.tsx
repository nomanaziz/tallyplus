import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/expiring")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Expiring Products" title={lang === "bn" ? "মেয়াদোত্তীর্ণ পণ্য" : "Expiring Products"} icon={icons.expired} />;
  },
});