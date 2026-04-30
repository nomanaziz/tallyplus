import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/PromoPopups";

export const Route = createFileRoute("/admin/promo-popups")({
  ssr: false,
  component: Page,
});
