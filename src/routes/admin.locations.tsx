import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Locations"));

export const Route = createFileRoute("/admin/locations")({
  ssr: false,
  component: Page,
});
