import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/access")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="App Access" title={lang === "bn" ? "অ্যাপ অ্যাক্সেস" : "App Access"} icon={icons.access} />;
  },
});