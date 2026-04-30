import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Layout = lazyRouteComponent(() => import("@/pages/customer/CustomerLayout"));

export const Route = createFileRoute("/customer")({
  ssr: false,
  component: Layout,
});
