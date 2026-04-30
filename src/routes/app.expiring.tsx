import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Expiring"));

export const Route = createFileRoute("/app/expiring")({
  ssr: false,
  component: Page,
});
