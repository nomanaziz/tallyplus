import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/Terms"));

export const Route = createFileRoute("/terms")({
  ssr: false,
  component: Page,
});
