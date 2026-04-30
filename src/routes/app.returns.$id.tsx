import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/returns/Id"));

export const Route = createFileRoute("/app/returns/$id")({
  ssr: false,
  component: Page,
});
