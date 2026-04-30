import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/UsageLimits"));

export const Route = createFileRoute("/app/usage-limits")({
  ssr: false,
  component: Page,
});
