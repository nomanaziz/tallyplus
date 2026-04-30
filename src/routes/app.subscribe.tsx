import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Subscribe";

export const Route = createFileRoute("/app/subscribe")({
  ssr: false,
  component: Page,
});
