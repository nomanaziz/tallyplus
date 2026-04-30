import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Login"));

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  component: Page,
});
