import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Index";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: Page,
});
