import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/shop/p/Id"));

export const Route = createFileRoute("/shop/p/$id")({
  ssr: false,
  component: Page,
});
