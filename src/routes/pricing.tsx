import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/Pricing"));

export const Route = createFileRoute("/pricing")({
  ssr: false,
  component: Page,
});
