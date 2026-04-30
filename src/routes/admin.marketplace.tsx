import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Marketplace"));

export const Route = createFileRoute("/admin/marketplace")({
  ssr: false,
  component: Page,
});
