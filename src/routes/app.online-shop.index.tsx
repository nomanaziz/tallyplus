import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Index"));

export const Route = createFileRoute("/app/online-shop/")({
  ssr: false,
  component: Page,
});
