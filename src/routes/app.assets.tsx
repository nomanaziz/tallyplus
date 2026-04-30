import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Assets";

export const Route = createFileRoute("/app/assets")({
  ssr: false,
  component: Page,
});
