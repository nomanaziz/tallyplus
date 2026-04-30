import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Products"));

export const Route = createFileRoute("/app/products")({
  ssr: false,
  component: Page,
});
