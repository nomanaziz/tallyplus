import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Marketplace";

export const Route = createFileRoute("/admin/marketplace")({
  ssr: false,
  component: Page,
});
