import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Returns";

export const Route = createFileRoute("/app/returns")({
  ssr: false,
  component: Page,
});
