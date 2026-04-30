import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/PaymentAttempts";

export const Route = createFileRoute("/admin/payment-attempts")({
  ssr: false,
  component: Page,
});
