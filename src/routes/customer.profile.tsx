import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/customer/Profile"));

export const Route = createFileRoute("/customer/profile")({
  ssr: false,
  component: Page,
});
