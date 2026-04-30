import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/SubscribeCallback"));

export const Route = createFileRoute("/app/subscribe/callback")({
  ssr: false,
  component: Page,
});
