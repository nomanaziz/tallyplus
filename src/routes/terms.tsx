import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Terms";

export const Route = createFileRoute("/terms")({
  ssr: false,
  component: Page,
});
