import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Plans";

export const Route = createFileRoute("/admin/plans")({
  ssr: false,
  component: Page,
});
