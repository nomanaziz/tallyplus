import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Reports";

export const Route = createFileRoute("/app/reports")({
  ssr: false,
  component: Page,
});
