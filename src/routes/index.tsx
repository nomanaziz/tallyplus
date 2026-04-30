import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/Index"));

export const Route = createFileRoute("/")({
  ssr: false,
  component: Page,
});
