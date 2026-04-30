import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Returns"));

export const Route = createFileRoute("/app/returns")({
  ssr: false,
  component: Page,
});
