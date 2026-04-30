import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Warranty";

export const Route = createFileRoute("/app/warranty")({
  ssr: false,
  component: Page,
});
