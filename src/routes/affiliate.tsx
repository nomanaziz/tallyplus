import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/Affiliate";

export const Route = createFileRoute("/affiliate")({
  ssr: false,
  component: Page,
});
