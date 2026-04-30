import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Affiliates";

export const Route = createFileRoute("/admin/affiliates")({
  ssr: false,
  component: Page,
});
