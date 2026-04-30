import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Layout = lazyRouteComponent(() => import("@/pages/f/Slug"));

export const Route = createFileRoute("/f/$slug")({
  ssr: false,
  component: Layout,
});
