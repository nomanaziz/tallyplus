import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Customize"));

export const Route = createFileRoute("/app/online-shop/customize")({
  ssr: false,
  component: Page,
});
