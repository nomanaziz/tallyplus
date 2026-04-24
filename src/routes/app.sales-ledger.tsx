import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/sales-ledger")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Sales Ledger" title={lang === "bn" ? "বেচার খাতা" : "Sales Ledger"} icon={icons.salesList} />;
  },
});