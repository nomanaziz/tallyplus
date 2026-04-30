import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Landing";

export const Route = createFileRoute("/admin/landing")({
  ssr: false,
  component: Page,
});
