import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Users";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  component: Page,
});
