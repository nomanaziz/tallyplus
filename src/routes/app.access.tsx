import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Access";

export const Route = createFileRoute("/app/access")({
  ssr: false,
  component: Page,
});
