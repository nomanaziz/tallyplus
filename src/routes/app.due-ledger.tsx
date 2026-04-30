import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/DueLedger"));

export const Route = createFileRoute("/app/due-ledger")({
  ssr: false,
  component: Page,
});
