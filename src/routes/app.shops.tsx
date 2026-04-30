import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Shops";

export const Route = createFileRoute("/app/shops")({
  ssr: false,
  component: Page,
});
