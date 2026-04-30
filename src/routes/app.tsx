import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Layout = lazyRouteComponent(() => import("@/pages/app/AppLayout"));

export const Route = createFileRoute("/app")({
  ssr: false,
  component: Layout,
});
