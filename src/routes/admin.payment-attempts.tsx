import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/PaymentAttempts"));

export const Route = createFileRoute("/admin/payment-attempts")({
  ssr: false,
  component: Page,
});
