import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/customer/Money"));

export const Route = createFileRoute("/customer/money")({
  ssr: false,
  component: Page,
});
