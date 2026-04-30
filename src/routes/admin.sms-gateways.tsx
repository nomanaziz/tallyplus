import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/admin/SmsGateways"));

export const Route = createFileRoute("/admin/sms-gateways")({
  ssr: false,
  component: Page,
});
