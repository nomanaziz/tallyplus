import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Training"));

export const Route = createFileRoute("/app/training")({
  ssr: false,
  component: Page,
});
