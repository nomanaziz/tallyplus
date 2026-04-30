import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/PaymentGateway"));

export const Route = createFileRoute("/admin/payment-gateway")({
  ssr: false,
  component: Page,
});
