import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/DueLedger";

export const Route = createFileRoute("/app/due-ledger")({
  ssr: false,
  component: Page,
});
