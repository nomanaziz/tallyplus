import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/BuySms"));

export const Route = createFileRoute("/app/buy-sms")({
  ssr: false,
  component: Page,
});
