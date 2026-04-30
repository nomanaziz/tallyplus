import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/QuickOrder"));

export const Route = createFileRoute("/app/quick-order")({
  ssr: false,
  component: Page,
});
