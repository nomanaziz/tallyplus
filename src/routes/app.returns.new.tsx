import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/returns/New"));

export const Route = createFileRoute("/app/returns/new")({
  ssr: false,
  component: Page,
});
