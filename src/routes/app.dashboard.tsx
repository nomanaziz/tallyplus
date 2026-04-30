import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Dashboard";

export const Route = createFileRoute("/app/dashboard")({
  ssr: false,
  component: Page,
});
