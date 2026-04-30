import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Training"));

export const Route = createFileRoute("/admin/training")({
  ssr: false,
  component: Page,
});
