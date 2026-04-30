import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/customer/MyFordo"));

export const Route = createFileRoute("/customer/my-fordo")({
  ssr: false,
  component: Page,
});
