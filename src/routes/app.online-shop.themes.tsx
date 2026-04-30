import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Themes"));

export const Route = createFileRoute("/app/online-shop/themes")({
  ssr: false,
  component: Page,
});
