import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Policy"));

export const Route = createFileRoute("/app/online-shop/policy")({
  ssr: false,
  component: Page,
});
