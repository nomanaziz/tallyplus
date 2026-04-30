import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/SalesLedger"));

export const Route = createFileRoute("/app/sales-ledger")({
  ssr: false,
  component: Page,
});
