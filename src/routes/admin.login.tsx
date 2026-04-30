import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Login";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  component: Page,
});
