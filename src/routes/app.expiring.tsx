import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Expiring";

export const Route = createFileRoute("/app/expiring")({
  ssr: false,
  component: Page,
});
