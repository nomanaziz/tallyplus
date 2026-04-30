import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/PaymentGateway";

export const Route = createFileRoute("/admin/payment-gateway")({
  ssr: false,
  component: Page,
});
