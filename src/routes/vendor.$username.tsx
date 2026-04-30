import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/vendor/Username";

export const Route = createFileRoute("/vendor/$username")({
  ssr: false,
  component: Page,
});
