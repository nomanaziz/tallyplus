import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Settings"));

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  component: Page,
});
