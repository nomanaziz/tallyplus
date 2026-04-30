import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Sell"));

export const Route = createFileRoute("/app/sell")({
  ssr: false,
  component: Page,
});
