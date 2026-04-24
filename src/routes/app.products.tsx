import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { icons } from "@/lib/icons";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/products")({
  component: () => {
    const { lang } = useI18n();
    return <PlaceholderPage breadcrumb="Product List" title={lang === "bn" ? "প্রোডাক্ট লিস্ট" : "Product List"} icon={icons.productList} />;
  },
});