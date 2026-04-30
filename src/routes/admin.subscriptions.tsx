import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Subscriptions";

export const Route = createFileRoute("/admin/subscriptions")({
  ssr: false,
  component: Page,
});
