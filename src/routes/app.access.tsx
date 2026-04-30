import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Access"));

export const Route = createFileRoute("/app/access")({
  ssr: false,
  component: Page,
});
