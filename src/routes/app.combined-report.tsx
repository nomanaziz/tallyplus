import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/CombinedReport"));

export const Route = createFileRoute("/app/combined-report")({
  ssr: false,
  component: Page,
});
