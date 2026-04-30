import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Dashboard"));

export const Route = createFileRoute("/app/dashboard")({
  ssr: false,
  component: Page,
});
