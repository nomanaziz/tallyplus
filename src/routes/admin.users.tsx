import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Users"));

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  component: Page,
});
