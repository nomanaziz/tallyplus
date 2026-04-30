import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/FordoHistory"));

export const Route = createFileRoute("/app/fordo-history")({
  ssr: false,
  component: Page,
});
