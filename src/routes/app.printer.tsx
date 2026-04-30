import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Printer"));

export const Route = createFileRoute("/app/printer")({
  ssr: false,
  component: Page,
});
