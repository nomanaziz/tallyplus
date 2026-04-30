import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/shop/s/Slug"));

export const Route = createFileRoute("/shop/s/$slug")({
  ssr: false,
  component: Page,
});
