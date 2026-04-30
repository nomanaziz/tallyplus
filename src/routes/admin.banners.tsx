import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/Banners"));

export const Route = createFileRoute("/admin/banners")({
  ssr: false,
  component: Page,
});
