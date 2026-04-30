import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Subscribe"));

export const Route = createFileRoute("/app/subscribe")({
  ssr: false,
  component: Page,
});
