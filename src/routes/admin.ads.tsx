import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Ads";

export const Route = createFileRoute("/admin/ads")({
  ssr: false,
  component: Page,
});
