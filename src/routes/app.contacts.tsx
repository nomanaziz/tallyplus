import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/contacts")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Contacts" title={lang === "bn" ? "যোগাযোগ" : "Contacts"} icon={icons.contact} />;
  },
});