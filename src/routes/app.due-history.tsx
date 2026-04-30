import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/DueHistory"));

export const Route = createFileRoute("/app/due-history")({
  ssr: false,
  component: Page,
});
