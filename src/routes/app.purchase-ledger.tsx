import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/PurchaseLedger"));

export const Route = createFileRoute("/app/purchase-ledger")({
  ssr: false,
  component: Page,
});
