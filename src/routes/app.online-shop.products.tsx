import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Products"));

export const Route = createFileRoute("/app/online-shop/products")({
  ssr: false,
  component: Page,
});
