import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/cashbox")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Cashbox" title={lang === "bn" ? "ক্যাশবক্স" : "Cashbox"} icon={icons.cashbox} />;
  },
});