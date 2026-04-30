import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Layout = lazyRouteComponent(() => import("@/pages/Admin"));

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: Layout,
});
