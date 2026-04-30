import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/OwnerLedger";

export const Route = createFileRoute("/app/owner-ledger")({
  ssr: false,
  component: Page,
});
