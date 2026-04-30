import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/UsageLimits";

export const Route = createFileRoute("/admin/usage-limits")({
  ssr: false,
  component: Page,
});
