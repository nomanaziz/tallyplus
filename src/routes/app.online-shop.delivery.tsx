import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Delivery"));

export const Route = createFileRoute("/app/online-shop/delivery")({
  ssr: false,
  component: Page,
});
