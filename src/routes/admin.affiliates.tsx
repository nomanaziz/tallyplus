import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Affiliates"));

export const Route = createFileRoute("/admin/affiliates")({
  ssr: false,
  component: Page,
});
