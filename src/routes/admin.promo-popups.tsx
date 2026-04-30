import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/PromoPopups"));

export const Route = createFileRoute("/admin/promo-popups")({
  ssr: false,
  component: Page,
});
