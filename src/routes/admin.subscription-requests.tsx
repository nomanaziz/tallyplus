import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/SubscriptionRequests"));

export const Route = createFileRoute("/admin/subscription-requests")({
  ssr: false,
  component: Page,
});
