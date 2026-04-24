import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/purchase-ledger")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Purchase Ledger" title={lang === "bn" ? "কেনার খাতা" : "Purchase Ledger"} icon={icons.purchaseList} />;
  },
});