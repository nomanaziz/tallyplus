import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Layout = lazyRouteComponent(() => import("@/pages/app/OnlineShop"));

export const Route = createFileRoute("/app/online-shop")({
  ssr: false,
  component: Layout,
});
