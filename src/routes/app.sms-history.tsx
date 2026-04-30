import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/SmsHistory"));

export const Route = createFileRoute("/app/sms-history")({
  ssr: false,
  component: Page,
});
