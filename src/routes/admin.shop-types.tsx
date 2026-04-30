import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/ShopTypes"));

export const Route = createFileRoute("/admin/shop-types")({
  ssr: false,
  component: Page,
});
