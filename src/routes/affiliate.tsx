import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/Affiliate"));

export const Route = createFileRoute("/affiliate")({
  ssr: false,
  component: Page,
});
