import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Training";

export const Route = createFileRoute("/app/training")({
  ssr: false,
  component: Page,
});
