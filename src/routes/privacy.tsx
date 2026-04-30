import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Privacy";

export const Route = createFileRoute("/privacy")({
  ssr: false,
  component: Page,
});
