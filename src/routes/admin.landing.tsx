import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Landing"));

export const Route = createFileRoute("/admin/landing")({
  ssr: false,
  component: Page,
});
