import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/training")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Training" title={lang === "bn" ? "অ্যাপ ট্রেনিং" : "App Training"} icon={icons.training} />;
  },
});