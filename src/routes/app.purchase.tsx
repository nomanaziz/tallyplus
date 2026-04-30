import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Purchase";

export const Route = createFileRoute("/app/purchase")({
  ssr: false,
  component: Page,
});
