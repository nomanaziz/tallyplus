import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Cashbox"));

export const Route = createFileRoute("/app/cashbox")({
  ssr: false,
  component: Page,
});
