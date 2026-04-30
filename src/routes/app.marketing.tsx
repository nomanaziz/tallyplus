import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Marketing";

export const Route = createFileRoute("/app/marketing")({
  ssr: false,
  component: Page,
});
