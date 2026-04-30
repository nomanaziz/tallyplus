import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/QuickOrder";

export const Route = createFileRoute("/app/quick-order")({
  ssr: false,
  component: Page,
});
