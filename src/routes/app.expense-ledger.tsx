import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/ExpenseLedger"));

export const Route = createFileRoute("/app/expense-ledger")({
  ssr: false,
  component: Page,
});
