import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/UsageLimits";

export const Route = createFileRoute("/app/usage-limits")({
  ssr: false,
  component: Page,
});
