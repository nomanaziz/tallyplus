import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/vendor/Username"));

export const Route = createFileRoute("/vendor/$username")({
  ssr: false,
  component: Page,
});
