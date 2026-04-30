import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/returns/Id";

export const Route = createFileRoute("/app/returns/$id")({
  ssr: false,
  component: Page,
});
