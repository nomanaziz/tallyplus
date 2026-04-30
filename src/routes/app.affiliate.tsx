import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Affiliate"));

export const Route = createFileRoute("/app/affiliate")({
  ssr: false,
  component: Page,
});
