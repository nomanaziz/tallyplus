import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Warranty"));

export const Route = createFileRoute("/app/warranty")({
  ssr: false,
  component: Page,
});
