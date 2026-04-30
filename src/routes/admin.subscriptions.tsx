import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Subscriptions"));

export const Route = createFileRoute("/admin/subscriptions")({
  ssr: false,
  component: Page,
});
