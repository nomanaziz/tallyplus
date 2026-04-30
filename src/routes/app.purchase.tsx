import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Purchase"));

export const Route = createFileRoute("/app/purchase")({
  ssr: false,
  component: Page,
});
