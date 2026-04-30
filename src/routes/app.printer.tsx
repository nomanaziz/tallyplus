import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Printer";

export const Route = createFileRoute("/app/printer")({
  ssr: false,
  component: Page,
});
