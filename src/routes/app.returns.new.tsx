import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/returns/New";

export const Route = createFileRoute("/app/returns/new")({
  ssr: false,
  component: Page,
});
