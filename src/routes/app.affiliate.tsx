import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Affiliate";

export const Route = createFileRoute("/app/affiliate")({
  ssr: false,
  component: Page,
});
