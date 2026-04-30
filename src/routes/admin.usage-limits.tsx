import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/UsageLimits"));

export const Route = createFileRoute("/admin/usage-limits")({
  ssr: false,
  component: Page,
});
