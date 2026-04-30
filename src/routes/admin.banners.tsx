import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Banners";

export const Route = createFileRoute("/admin/banners")({
  ssr: false,
  component: Page,
});
