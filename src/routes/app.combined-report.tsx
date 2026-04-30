import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/CombinedReport";

export const Route = createFileRoute("/app/combined-report")({
  ssr: false,
  component: Page,
});
