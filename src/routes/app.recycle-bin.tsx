import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/recycle-bin")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Recycle Bin" title={lang === "bn" ? "রিসাইকেল বিন" : "Recycle Bin"} icon={icons.recycle} />;
  },
});