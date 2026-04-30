import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Settings"));

export const Route = createFileRoute("/app/online-shop/settings")({
  ssr: false,
  component: Page,
});
