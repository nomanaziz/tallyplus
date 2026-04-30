import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Marketing"));

export const Route = createFileRoute("/app/online-shop/marketing")({
  ssr: false,
  component: Page,
});
