import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Featured"));

export const Route = createFileRoute("/app/online-shop/featured")({
  ssr: false,
  component: Page,
});
