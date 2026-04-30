import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/OwnerLedger"));

export const Route = createFileRoute("/app/owner-ledger")({
  ssr: false,
  component: Page,
});
