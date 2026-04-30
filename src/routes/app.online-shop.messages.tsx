import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/Messages"));

export const Route = createFileRoute("/app/online-shop/messages")({
  ssr: false,
  component: Page,
});
