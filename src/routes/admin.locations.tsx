import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/Locations";

export const Route = createFileRoute("/admin/locations")({
  ssr: false,
  component: Page,
});
