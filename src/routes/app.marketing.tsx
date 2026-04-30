import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Marketing"));

export const Route = createFileRoute("/app/marketing")({
  ssr: false,
  component: Page,
});
