import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Shops"));

export const Route = createFileRoute("/app/shops")({
  ssr: false,
  component: Page,
});
