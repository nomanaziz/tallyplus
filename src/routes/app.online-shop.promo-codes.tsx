import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/online-shop/PromoCodes"));

export const Route = createFileRoute("/app/online-shop/promo-codes")({
  ssr: false,
  component: Page,
});
