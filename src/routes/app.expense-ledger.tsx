import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/expense-ledger")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Expense Ledger" title={lang === "bn" ? "খরচের খাতা" : "Expense Ledger"} icon={icons.expense} />;
  },
});