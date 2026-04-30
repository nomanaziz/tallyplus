import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/ExpenseLedger";

export const Route = createFileRoute("/app/expense-ledger")({
  ssr: false,
  component: Page,
});
