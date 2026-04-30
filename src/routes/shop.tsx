import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/shop/Index"));

export const Route = createFileRoute("/shop")({
  ssr: false,
  component: Page,
});
