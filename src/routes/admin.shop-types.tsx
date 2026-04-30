import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/ShopTypes";

export const Route = createFileRoute("/admin/shop-types")({
  ssr: false,
  component: Page,
});
