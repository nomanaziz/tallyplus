import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Reports"));

export const Route = createFileRoute("/app/reports")({
  ssr: false,
  component: Page,
});
