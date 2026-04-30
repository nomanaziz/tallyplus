import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Plans"));

export const Route = createFileRoute("/admin/plans")({
  ssr: false,
  component: Page,
});
