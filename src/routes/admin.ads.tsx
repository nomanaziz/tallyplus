import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Ads"));

export const Route = createFileRoute("/admin/ads")({
  ssr: false,
  component: Page,
});
