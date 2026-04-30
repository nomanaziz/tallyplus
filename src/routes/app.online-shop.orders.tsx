import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Orders"));

export const Route = createFileRoute("/app/online-shop/orders")({
  ssr: false,
  component: Page,
});
