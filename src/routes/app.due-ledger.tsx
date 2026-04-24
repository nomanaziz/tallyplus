import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/due-ledger")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Due Ledger" title={lang === "bn" ? "বাকির খাতা" : "Due Ledger"} icon={icons.due} />;
  },
});