import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/customer/Dashboard"));

export const Route = createFileRoute("/customer/dashboard")({
  ssr: false,
  component: Page,
});
