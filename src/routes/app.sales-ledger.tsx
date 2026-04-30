import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/SalesLedger";

export const Route = createFileRoute("/app/sales-ledger")({
  ssr: false,
  component: Page,
});
