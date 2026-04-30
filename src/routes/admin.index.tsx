import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Index"));

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: Page,
});
