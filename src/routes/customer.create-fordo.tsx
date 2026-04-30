import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/customer/CreateFordo"));

export const Route = createFileRoute("/customer/create-fordo")({
  ssr: false,
  component: Page,
});
