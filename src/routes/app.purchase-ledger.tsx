import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/PurchaseLedger";

export const Route = createFileRoute("/app/purchase-ledger")({
  ssr: false,
  component: Page,
});
