import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Training";

export const Route = createFileRoute("/admin/training")({
  ssr: false,
  component: Page,
});
