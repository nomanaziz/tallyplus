import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/FordoHistory";

export const Route = createFileRoute("/app/fordo-history")({
  ssr: false,
  component: Page,
});
