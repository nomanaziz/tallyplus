import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/affiliate/Register"));

export const Route = createFileRoute("/affiliate/register")({
  ssr: false,
  component: Page,
});
