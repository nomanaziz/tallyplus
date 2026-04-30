import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Settings";

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  component: Page,
});
