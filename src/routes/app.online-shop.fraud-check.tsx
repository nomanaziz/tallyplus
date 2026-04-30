import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/FraudCheck"));

export const Route = createFileRoute("/app/online-shop/fraud-check")({
  ssr: false,
  component: Page,
});
