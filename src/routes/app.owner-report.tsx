import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/OwnerReport"));

export const Route = createFileRoute("/app/owner-report")({
  ssr: false,
  component: Page,
});
