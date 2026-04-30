import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/DueHistory";

export const Route = createFileRoute("/app/due-history")({
  ssr: false,
  component: Page,
});
