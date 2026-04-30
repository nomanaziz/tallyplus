import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/Privacy"));

export const Route = createFileRoute("/privacy")({
  ssr: false,
  component: Page,
});
