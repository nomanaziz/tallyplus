import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Pricing";

export const Route = createFileRoute("/pricing")({
  ssr: false,
  component: Page,
});
